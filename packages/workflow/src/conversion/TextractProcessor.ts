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
    detectImages?: boolean;  // New option for image detection
}

export class TextractProcessor {
    private textractClient: TextractClient;
    private s3Client: S3Client;
    private fileKey: string;
    private bucket: string;
    private log: any;
    private detectImages: boolean;

    constructor({ 
        fileKey, 
        region, 
        bucket, 
        credentials, 
        log,
        detectImages = false  // Default to false
    }: TextractProcessorOptions) {
        this.fileKey = fileKey;
        this.bucket = bucket;
        this.log = log;
        this.detectImages = detectImages;
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
        // First check if this block is directly in a table
        for (const [_, parentBlock] of Object.entries(blocksMap)) {
            if (parentBlock.BlockType === 'TABLE') {
                if (parentBlock.Relationships) {
                    for (const relationship of parentBlock.Relationships) {
                        if (relationship.Type === 'CHILD') {
                            // Check each cell in the table
                            for (const cellId of relationship.Ids || []) {
                                const cell = blocksMap[cellId];
                                if (cell.Relationships) {
                                    // Check content of each cell
                                    for (const cellRelation of cell.Relationships) {
                                        if (cellRelation.Type === 'CHILD' && 
                                            cellRelation.Ids?.includes(block.Id!)) {
                                            return true;
                                        }
                                    }
                                }
                            }
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

        // Only process large images
        const area = (geometry.Width || 0) * (geometry.Height || 0);
        if (area < 0.1) return ''; // Skip small images

        const top = geometry.Top || 0;
        const left = geometry.Left || 0;
        
        let position = '';
        if (top < 0.3) position += 'TOP_';
        else if (top > 0.7) position += 'BOTTOM_';
        
        if (left < 0.3) position += 'LEFT';
        else if (left > 0.7) position += 'RIGHT';
        else position += 'CENTER';

        return `[IMAGE_${position}]\n`;
    }

    private getIndentationLevel(block: Block): number {
        const left = block.Geometry?.BoundingBox?.Left || 0;
        if (left < 0.15) return 0;
        if (left < 0.25) return 1;
        return 2;
    }

    private isLikelyHeader(block: Block, prevBlock: Block | null): boolean {
        if (!prevBlock) return true;
        
        const gap = (block.Geometry?.BoundingBox?.Top || 0) -
                   ((prevBlock.Geometry?.BoundingBox?.Top || 0) + 
                    (prevBlock.Geometry?.BoundingBox?.Height || 0));
        
        return gap > 0.03;
    }

    private formatTextBlock(block: Block, prevBlock: Block | null): string {
        const text = block.Text || '';
        const indentLevel = this.getIndentationLevel(block);
        const indent = '    '.repeat(indentLevel);
        
        if (this.isLikelyHeader(block, prevBlock)) {
            return `\n${indent}${text}\n`;
        }
        
        return `${indent}${text}\n`;
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

        const pageContents: PageContent[] = [];
        let currentPage: PageContent | null = null;
        let prevBlock: Block | null = null;

        // Sort blocks by page and vertical position
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
                prevBlock = null;
            } else if (currentPage && block.Page === currentPage.pageNumber) {
                if (block.BlockType === 'LINE' && !this.isBlockInTable(block, blocksMap)) {
                    currentPage.text += this.formatTextBlock(block, prevBlock);
                    prevBlock = block;
                } else if (block.BlockType === 'TABLE') {
                    const tableContent = this.generateTableCSV(
                        block,
                        blocksMap,
                        currentPage.tables.length + 1,
                        currentPage.pageNumber
                    );
                    currentPage.tables.push(tableContent);
                } else if (this.detectImages) {  // Only process images if enabled
                    const geometry = block.Geometry?.BoundingBox;
                    if (geometry && geometry.Width && geometry.Height) {
                        currentPage.text += this.getImagePlaceholder(block);
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