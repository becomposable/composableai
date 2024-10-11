import { Blobs, md5 } from '@becomposable/blobs';
import { ComposableClient } from "@becomposable/client";
import { ContentObject, DSLActivityExecutionPayload, DSLActivitySpec, ProjectConfigurationEmbeddings, SupportedEmbeddingTypes } from "@becomposable/common";
import { EmbeddingsResult } from "@llumiverse/core";
import { log } from "@temporalio/activity";
import * as tf from '@tensorflow/tfjs-node';
import { setupActivity } from "../dsl/setup/ActivityContext.js";
import { NoDocumentFound } from '../errors.js';
import { countTokens } from "../utils/tokens.js";


export interface GenerateEmbeddingsParams {
    model?: string;
    environment?: string;
    force?: boolean;
    type: SupportedEmbeddingTypes;
}

export interface GenerateEmbeddings extends DSLActivitySpec<GenerateEmbeddingsParams> {
    name: 'generateEmbeddings';
}

export async function generateEmbeddings(payload: DSLActivityExecutionPayload) {
    const { params, client, objectId, fetchProject } = await setupActivity<GenerateEmbeddingsParams>(payload);
    const { force, type } = params;

    const projectData = await fetchProject();
    const config = projectData?.configuration.embeddings[type];
    if (!projectData) {
        throw new NoDocumentFound('Project not found', [payload.project_id]);
    }
    if (!config) {
        throw new NoDocumentFound('Embeddings configuration not found', [objectId])
    }

    if (!projectData) {
        throw new NoDocumentFound('Project not found', [payload.project_id]);
    }

    if (!projectData?.configuration.embeddings[type]?.enabled) {
        log.info(`Embeddings generation disabled for type ${type} on project: ${projectData.name} (${projectData.namespace})`, { config });
        return { id: objectId, status: "skipped", message: `Embeddings generation disabled for type ${type}` }
    }

    log.info(`${type} embedding generation starting for object ${objectId}`, { force, config });

    if (!config.environment) {
        throw new Error('No environment found in project configuration. Set environment in project configuration to generate embeddings.');
    }

    const document = await client.objects.retrieve(objectId, "+text +parts +embedding +tokens +properties");

    if (!document) {
        throw new NoDocumentFound('Document not found', [objectId]);
    }

    if (!document.content) {
        throw new NoDocumentFound('Document content not found', [objectId]);
    }

    let res;


    switch (type) {
        case SupportedEmbeddingTypes.text:
            res = await generateTextEmbeddings({
                client, 
                config,
                document,
                type
            })
            break;
        case SupportedEmbeddingTypes.properties:
            res = await generateTextEmbeddings({
                client, 
                config,
                document,
                type,
            });
            break;
        case SupportedEmbeddingTypes.image:
            res = await generateImageEmbeddings({
                client,
                config,
                document,
                type
            });
            break;
        default:
            res = { id: objectId, status: "failed", message: `unsupported embedding type: ${type}` }
    }

    return res;

}


interface ExecuteGenerateEmbeddingsParams {
    document: ContentObject;
    client: ComposableClient;
    type: SupportedEmbeddingTypes;
    config: ProjectConfigurationEmbeddings;
    property?: string;
    force?: boolean;
}

async function generateTextEmbeddings({ document, client, type, config, force }: ExecuteGenerateEmbeddingsParams) {
    // if (!force && document.embeddings[type]?.etag === (document.text_etag ?? md5(document.text))) {
    //     return { id: objectId, status: "skipped", message: "embeddings already generated" }
    // }

    if (type !== SupportedEmbeddingTypes.text && type !== SupportedEmbeddingTypes.properties) {
        return { id: document.id, status: "failed", message: `unsupported embedding type: ${type}` }
    }

    if (type === SupportedEmbeddingTypes.text && !document?.text) {
        return { id: document.id, status: "failed", message: "no text found" }
    }
    if (type === SupportedEmbeddingTypes.properties && !document?.properties) {
        return { id: document.id, status: "failed", message: "no properties found" }
    }

    const { environment, model } = config;

    // Count tokens if not already done
    if (!document.tokens?.count && type === SupportedEmbeddingTypes.text) {
        log.debug('Updating token count for document: ' + document.id);
        const tokensData = countTokens(document.text!);
        await client.objects.update(document.id, {
            tokens: {
                ...tokensData,
                etag: document.text_etag ?? md5(document.text!)
            }
        });
        document.tokens = {
            ...tokensData,
            etag: document.text_etag ?? md5(document.text!)
        };
    }

    const maxTokens = config.max_tokens ?? 8000;

    //generate embeddings for the main doc if document isn't too large
    //if too large, we'll just generate embeddings for the parts
    //then we can generate embeddings for the main document by averaging the tensors
    log.info(`Generating ${type} embeddings for document ${document.id}`);
    if (type === SupportedEmbeddingTypes.text && document.tokens?.count && document.tokens?.count > maxTokens) {
        log.info('Document too large, generating embeddings for parts');

        if (!document.parts || document.parts.length === 0) {
            return { id: document.id, status: "failed", message: "no parts found" }
        }

        const docParts = await Promise.all(document.parts?.map(async (partId) => client.objects.retrieve(partId, "+text +embedding +tokens")));

        const res = await Promise.all(docParts.map(async (part, i) => {
            if (!part.text) {
                return { id: part.id, number: i, result: null, message: "no text found" }
            }

            if (part.tokens?.count && part.tokens.count > maxTokens) {
                log.info('Part too large, skipping embeddings generation for part', { part: part.id, tokens: part.tokens.count });
                return { id: part.id, number: i, result: null, message: "part too large" }
            }


            if (!force && part.embeddings[type]?.etag === (part.text_etag ?? md5(part.text))) {
                return { id: part.id, number: i }
            }

            const e = await generateEmbeddingsFromStudio(part.text, environment, client, model).catch(e => {
                log.error('Error generating embeddings for part', { part: part.id, tokens: part.tokens, text_length: part.text?.length, error: e });
                return null;
            });

            if (!e || !e.values) {
                return { id: part.id, number: i, result: null, message: "no embeddings generated" }
            }

            const updated = await client.objects.update(part.id, {
                embeddings: {
                    text: {
                        values: e.values,
                        model: e.model,
                    }
                }
            });

            log.debug('Generated embeddings for part:', { result: updated });
            return { id: part.id, number: i, result: e }
        }));

        log.info('Got embeddings generated for parts:', res);

        // Filter out parts without embeddings
        const validEmbeddings = res.filter(item => item.result !== null) as { id: string, number: number, result: EmbeddingsResult }[];

        // Compute the document-level embedding using TensorFlow for attention mechanism
        log.info('Computing document-level embedding using TF');
        const documentEmbedding = computeAttentionEmbedding(validEmbeddings.map(item => item.result.values));

        // Save the document-level embedding
        await client.objects.retrieve(document.id).then(d => client.objects.update(d.id, {
            embeddings: {
                ...d.embeddings,
                [type]: {
                    values: documentEmbedding,
                    model: "attention",
                    etag: document.text_etag
                }
            }
        }));
        return { id: document.id, status: "completed", part: docParts.map(i => i.id), len: documentEmbedding.length }

    } else {
        log.info(`Generating ${type} embeddings for document`);

        const res = await generateEmbeddingsFromStudio(JSON.stringify(document[type]), environment, client);
        if (!res || !res.values) {
            return { id: document.id, status: "failed", message: "no embeddings generated" }
        }

        log.info(`${type} embeddings generated for document ${document.id}`, { len: res.values.length });
        await client.objects.retrieve(document.id).then(d => client.objects.update(d.id, {
            embeddings: {
                ...d.embeddings,
                [type]: {
                    values: res.values,
                    model: res.model,
                    etag: document.text_etag
                }
            }
        }));

        return { id: document.id, type, status: "completed", len: res.values.length }

    }

}

async function generateImageEmbeddings({ document, client, type, config }: ExecuteGenerateEmbeddingsParams) {

    log.info('Generating image embeddings for document ' + document.id, { content: document.content});
    if (!document.content?.type?.startsWith('image/') && !document.content?.type?.includes('pdf')) {
        return { id: document.id, type, status: "failed", message: "content is not an image" }
    }
    const { environment, model } = config

    const resRnd = await client.store.objects.getRendition(document.id, {
        format: "image/png",
        max_hw: 1024,
        generate_if_missing: true
    });

    if (resRnd.status === 'generating') {
        throw new Error("Rendition is generating, will retry later")
    } else if (resRnd.status === "failed" || !resRnd.rendition) {
        throw new NoDocumentFound("Rendition retrieval failed", [document.id])
    }

    if (!resRnd.rendition.content.source) {
        throw new NoDocumentFound("No source found in rendition", [document.id])
    }

    const image = await Blobs.getFile(resRnd.rendition.content.source).then(file => file.readAsBuffer()).then(b => b.toString('base64'))

    const res = await client.environments.embeddings(environment, {
        image,
        model
    }).then(res => res).catch(e => {
        log.error('Error generating embeddings for image', { error: e })
        throw e;
    });

    if (!res || !res.values) {
        return { id: document.id, status: "failed", message: "no embeddings generated" }
    }

    //TODO: replace by a an atomic REST call
    await client.objects.retrieve(document.id).then(d => client.objects.update(d.id, {
        embeddings: {
            ...d.embeddings,
            image: {
                values: res.values, 
                model: res.model,
                etag: document.text_etag
            }
        }
    }));

    return { id: document.id, type, status: "completed", len: res.values.length }

}

async function generateEmbeddingsFromStudio(text: string, env: string, client: ComposableClient, model?: string): Promise<EmbeddingsResult> {

    log.info(`Generating embeddings for text of ${text.length} chars with environment ${env}`);

    return client.environments.embeddings(env, {
        text,
        model
    }).then(res => res).catch(e => {
        log.error('Error generating embeddings for text', { error: e })
        throw e;
    });

}

function computeAttentionEmbedding(embeddingsArray: number[][], axis: number = 0) {
    if (embeddingsArray.length === 0) return [];
    log.info('Computing attention embedding for', { embeddingsArrays: embeddingsArray.map(a => a.length) });
    const start = new Date().getTime();

    // Convert embeddings array to TensorFlow tensor
    const embeddingsTensor = tf.tensor(embeddingsArray);

    // Initialize trainable attention weights
    const attentionWeights = tf.variable(tf.randomNormal([embeddingsArray.length]), true);

    // Compute attention scoresje sui
    const attentionScores = tf.softmax(attentionWeights);

    // Compute weighted sum of embeddings
    const weightedEmbeddings = tf.mul(embeddingsTensor.transpose(), attentionScores).transpose();
    const documentEmbeddingTensor = tf.sum(weightedEmbeddings, axis);

    // Convert the result back to a JavaScript array
    const documentEmbedding = documentEmbeddingTensor.arraySync() as number[];
    const duration = (new Date().getTime() - start);
    log.info(`Computed attention embeddings in ${duration}ms - array size: ${documentEmbedding.length}`, { length: documentEmbedding.length });

    // Clean up tensors
    embeddingsTensor.dispose();
    attentionWeights.dispose();
    attentionScores.dispose();
    weightedEmbeddings.dispose();
    documentEmbeddingTensor.dispose();

    return documentEmbedding;
}