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
    private log: any;

    constructor({ fileKey, region, bucket, credentials, log }: TextractProcessorOptions) {
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

        const csvData: string[][] = [];

        Object.entries(rows).forEach(([_rowIndex, cols]) => {
            const rowData: string[] = [];
            Object.entries(cols)
                .sort(([a], [b]) => Number(a) - Number(b))
                .forEach(([_, text]) => {
                    rowData.push((text as string).trim());
                });
            csvData.push(rowData);
        });

        return Papa.unparse(csvData, {
            delimiter: ',',
            quotes: true,
            quoteChar: '"',
            escapeChar: '"',
            header: false,
            newline: '\n',
            skipEmptyLines: false
        });
    }

    private isBlockInTable(block: Block, blocksMap: BlocksMap): boolean {
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

    async upload(fileBuf: Buffer): Promise<void> {
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


    private getImagePlaceholder(block: Block): string {
        const geometry = block.Geometry?.BoundingBox;
        if (!geometry) return '';

        // Convert relative coordinates to percentage
        const top = (geometry.Top || 0) * 100;
        const left = (geometry.Left || 0) * 100;
        const width = (geometry.Width || 0) * 100;
        const height = (geometry.Height || 0) * 100;

        return `<image top="${top.toFixed(1)}%" left="${left.toFixed(1)}%" width="${width.toFixed(1)}%" height="${height.toFixed(1)}%">[IMAGE]</image>\n`;
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

        // Process pages with invoice-specific handling
        const pageContents: PageContent[] = [];
        let currentPage: PageContent | null = null;
        let lastLineTop: number | null = null;

        // Sort blocks by page and position
        allBlocks.sort((a, b) => {
            if (a.Page !== b.Page) return (a.Page || 0) - (b.Page || 0);
            return (a.Geometry?.BoundingBox?.Top || 0) - (b.Geometry?.BoundingBox?.Top || 0);
        });

        for (const block of allBlocks) {
            if (block.BlockType === 'PAGE') {
                if (currentPage) {
                    pageContents.push(currentPage);
                }
                currentPage = {
                    pageNumber: block.Page || 0,
                    text: '',
                    tables: []
                };
                lastLineTop = null;
            } else if (currentPage && block.Page === currentPage.pageNumber) {
                if (block.BlockType === 'LINE' && !this.isBlockInTable(block, blocksMap)) {
                    const lineText = block.Text || '';
                    const currentTop = block.Geometry?.BoundingBox?.Top || 0;
                    const currentLeft = block.Geometry?.BoundingBox?.Left || 0;
                    
                    currentPage.text += `<line left="${(currentLeft * 100).toFixed(1)}%">${lineText}</line>\n`;
                    
                    if (lastLineTop !== null) {
                        const gap = currentTop - lastLineTop;
                        if (gap > 0.03) {
                            currentPage.text += '\n';
                        }
                    }
                    
                    lastLineTop = currentTop;
                } else if (block.BlockType === 'TABLE') {
                    currentPage.text = currentPage.text.trim() + '\n\n';
                    const tableContent = this.generateTableCSV(
                        block,
                        blocksMap,
                        currentPage.tables.length + 1,
                        currentPage.pageNumber
                    );
                    currentPage.tables.push(tableContent);
                    currentPage.text += '\n\n';
                } else if (block.BlockType === 'SIGNATURE') {
                    // Add signature placeholder with position
                    const geometry = block.Geometry?.BoundingBox;
                    if (geometry) {
                        const top = (geometry.Top || 0) * 100;
                        const left = (geometry.Left || 0) * 100;
                        currentPage.text += `<signature top="${top.toFixed(1)}%" left="${left.toFixed(1)}%">[SIGNATURE]</signature>\n`;
                    }
                } else if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
                    // Additional handling for form fields if needed
                    const keyText = this.getText(block, blocksMap);
                    const currentLeft = block.Geometry?.BoundingBox?.Left || 0;
                    currentPage.text += `<key left="${(currentLeft * 100).toFixed(1)}%">${keyText}</key>\n`;
                } else if (block.BlockType === 'MERGED_CELL' || block.BlockType === 'CELL') {
                    // Skip individual cells as they're handled in table processing
                    continue;
                } else {
                    // Handle any other block types that might contain images
                    const geometry = block.Geometry?.BoundingBox;
                    if (geometry && geometry.Width && geometry.Height) {
                        // Only add image placeholder for blocks that have some size
                        if (geometry.Width > 0.01 && geometry.Height > 0.01) {
                            currentPage.text += this.getImagePlaceholder(block);
                        }
                    }
                }
            }
        }

        // Handle last page
        if (currentPage) {
            pageContents.push(currentPage);
        }

        // Generate final output
        let fulltext = '';
        for (const p of pageContents) {
            fulltext += `<page number="${p.pageNumber}">\n`;
            fulltext += `<text>\n${p.text.trim()}\n</text>\n\n`;
            fulltext += "<tables>\n"
            p.tables.forEach((t, i) => fulltext += `<table number="${i}" type="csv">\n${t}\n</table>\n`)
            fulltext += "</tables>\n\n";
            fulltext += `</page>\n\n\n`;
        }

        return fulltext;
    }
    
}