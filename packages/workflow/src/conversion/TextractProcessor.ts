import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type {
    Block
} from "@aws-sdk/client-textract";
import {
    GetDocumentAnalysisCommand,
    StartDocumentAnalysisCommand,
    TextractClient
} from "@aws-sdk/client-textract";
import type { AwsCredentialIdentityProvider } from "@smithy/types";
import Papa from 'papaparse';

interface BlocksMap {
    [key: string]: Block;
}

interface TableRows {
    [key: number]: {
        [key: number]: string;
    };
}

interface PageContent {
    pageNumber: number;
    text: string;
    tables: string[];
}

interface TextractProcessorOptions {
    fileKey: string;
    region: string;
    bucket: string;
    credentials?: AwsCredentialIdentityProvider;
    log?: any;
}

export class TextractProcessor {
    private textractClient: TextractClient;
    private s3Client: S3Client;
    private fileKey: string;
    private bucket: string;
    private log: any; //type with Logger

    constructor( { fileKey, region, bucket, credentials, log }: TextractProcessorOptions) {
        this.fileKey = fileKey;
        this.bucket = bucket;
        this.log = log;
        this.textractClient = new TextractClient({
            region,
            credentials
        });
        this.s3Client = new S3Client({
            region,
            credentials
        });
    }

    private getText(result: Block, blocksMap: BlocksMap): string {
        let text = '';
        if (result.Relationships) {
            for (const relationship of result.Relationships) {
                if (relationship.Type === 'CHILD') {
                    for (const childId of relationship.Ids || []) {
                        const word = blocksMap[childId];
                        if (word.BlockType === 'WORD') {
                            const wordText = word.Text || '';
                            if (wordText.includes(',') &&
                                wordText.replace(',', '').match(/^\d+$/)) {
                                text += `"${wordText}" `;
                            } else {
                                text += `${wordText} `;
                            }
                        }
                        if (word.BlockType === 'SELECTION_ELEMENT' &&
                            word.SelectionStatus === 'SELECTED') {
                            text += 'X ';
                        }
                    }
                }
            }
        }
        return text.trim();
    }

    private getRowsColumnsMap(tableResult: Block, blocksMap: BlocksMap): { rows: TableRows; scores: string[] } {
        const rows: TableRows = {};
        const scores: string[] = [];

        tableResult.Relationships?.forEach(relationship => {
            if (relationship.Type === 'CHILD') {
                relationship.Ids?.forEach(childId => {
                    const cell = blocksMap[childId];
                    if (cell.BlockType === 'CELL') {
                        const rowIndex = cell.RowIndex || 0;
                        const colIndex = cell.ColumnIndex || 0;

                        if (!rows[rowIndex]) {
                            rows[rowIndex] = {};
                        }

                        scores.push(cell.Confidence?.toString() || '0');
                        rows[rowIndex][colIndex] = this.getText(cell, blocksMap);
                    }
                });
            }
        });

        return { rows, scores };
    }


    private generateTableCSV(tableResult: Block, blocksMap: BlocksMap,
        _tableIndex: number, _pageNumber: number): string {
        const { rows } = this.getRowsColumnsMap(tableResult, blocksMap);

        // Transform the nested object structure into a 2D array for PapaParse
        const csvData: string[][] = [];

        Object.entries(rows).forEach(([_rowIndex, cols]) => {
            // Create a new row array
            const rowData: string[] = [];

            // Fill the row with data from columns
            Object.entries(cols)
                .sort(([a], [b]) => Number(a) - Number(b)) // Ensure columns are in order
                .forEach(([_, text]) => {
                    rowData.push((text as string).trim());
                });

            csvData.push(rowData);
        });

        // Use PapaParse to generate the CSV string
        const csvString = Papa.unparse(csvData, {
            delimiter: ',',
            quotes: true,      // Automatically quote fields when necessary
            quoteChar: '"',
            escapeChar: '"',
            header: false,     // Don't generate header row
            newline: '\n',     // Specify newline character
            skipEmptyLines: false
        });

        return csvString;
    }

    private isBlockInTable(block: Block, blocksMap: BlocksMap): boolean {
        // For each block in the map, check if it's a CELL/TABLE and if this block is its child
        for (const [_, parentBlock] of Object.entries(blocksMap)) {
            if (parentBlock.BlockType === 'CELL' || parentBlock.BlockType === 'TABLE') {
                if (parentBlock.Relationships) {
                    for (const relationship of parentBlock.Relationships) {
                        if (relationship.Type === 'CHILD' &&
                            relationship.Ids?.includes(block.Id!)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    async upload(fileBuf: Buffer): Promise<void> { //TODO: change to Readable but issues with the SDK at this time
        this.log.info('Uploading file to S3', { fileKey: this.fileKey });
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: this.fileKey,
            Body: fileBuf,
        });
        await this.s3Client.send(command);
    }

    async startAnalysis(s3Key: string): Promise<string> {
        const command = new StartDocumentAnalysisCommand({
            DocumentLocation: {
                S3Object: {
                    Bucket: this.bucket,
                    Name: s3Key
                }
            },
            FeatureTypes: ["TABLES"]
        });
        const response = await this.textractClient.send(command);
        return response.JobId!;
    }

    async checkJobStatus(jobId: string): Promise<string> {
        const command = new GetDocumentAnalysisCommand({ JobId: jobId });
        const response = await this.textractClient.send(command);
        return response.JobStatus!;
    }

    async processResults(jobId: string): Promise<string> {
        let nextToken: string | undefined;
        let allBlocks: Block[] = [];

        // Collect all blocks
        do {
            const command = new GetDocumentAnalysisCommand({
                JobId: jobId,
                NextToken: nextToken
            });
            const response = await this.textractClient.send(command);
            allBlocks = allBlocks.concat(response.Blocks || []);
            nextToken = response.NextToken;
        } while (nextToken);

        // Create blocks map for quick lookup
        const blocksMap: BlocksMap = {};
        allBlocks.forEach(block => {
            blocksMap[block.Id!] = block;
        });

        // Process each page
        const pageContents: PageContent[] = [];
        let currentPage: PageContent | null = null;
        let currentLine = '';

        // Sort blocks by page and position
        allBlocks.sort((a, b) => {
            if (a.Page !== b.Page) return (a.Page || 0) - (b.Page || 0);
            if (a.Geometry?.BoundingBox?.Top !== b.Geometry?.BoundingBox?.Top) {
                return (a.Geometry?.BoundingBox?.Top || 0) - (b.Geometry?.BoundingBox?.Top || 0);
            }
            return (a.Geometry?.BoundingBox?.Left || 0) - (b.Geometry?.BoundingBox?.Left || 0);
        });

        for (const block of allBlocks) {
            if (block.BlockType === 'PAGE') {
                if (currentPage) {
                    if (currentLine) {
                        currentPage.text += currentLine.trim() + '\n';
                        currentLine = '';
                    }
                    pageContents.push(currentPage);
                }
                currentPage = {
                    pageNumber: block.Page || 0,
                    text: '',
                    tables: []
                };
            } else if (currentPage && block.Page === currentPage.pageNumber) {
                if (block.BlockType === 'WORD') {
                    if (!this.isBlockInTable(block, blocksMap) && block.Text) {
                        currentLine += block.Text + ' ';
                    }
                } else if (block.BlockType === 'LINE') {
                    if (currentLine) {
                        currentPage.text += currentLine.trim() + '\n';
                        currentLine = '';
                    }
                } else if (block.BlockType === 'TABLE') {
                    if (currentLine) {
                        currentPage.text += currentLine.trim() + '\n';
                        currentLine = '';
                    }
                    const tableContent = this.generateTableCSV(
                        block,
                        blocksMap,
                        currentPage.tables.length + 1,
                        currentPage.pageNumber
                    );
                    currentPage.tables.push(tableContent);
                }
            }
        }

        // Handle last page and any pending line
        if (currentPage) {
            if (currentLine) {
                currentPage.text += currentLine.trim() + '\n';
            }
            pageContents.push(currentPage);
        }

        let fulltext = '';
        for (const p of pageContents) {
            fulltext += `<page number="${p.pageNumber}">\n`;
            fulltext += `<text>${p.text}</text>\n\n`;
            fulltext += "<tables>\n"
            p.tables.forEach((t, i) => fulltext += `<table number="${i}" type="csv">\n${t}\n</table>\n`)
            fulltext += "</tables>\n\n";
            fulltext += `</page>\n\n\n`;
        }

        return fulltext;

    }

}