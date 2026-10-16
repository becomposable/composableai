import { describe, expect, it } from 'vitest';
import { canGenerateRendition, ImageRenditionFormat, isVideoContentType } from './store.js';

describe('isVideoContentType', () => {
    it.each(['video/mp4', 'video/quicktime', 'application/mxf'])('treats %s as a video', (contentType) => {
        expect(isVideoContentType(contentType)).toBe(true);
    });

    it.each([undefined, '', 'audio/mpeg', 'application/pdf', 'application/octet-stream', 'text/plain'])(
        'does not treat %s as a video',
        (contentType) => {
            expect(isVideoContentType(contentType)).toBe(false);
        },
    );
});

describe('canGenerateRendition', () => {
    it('generates the same thumbnails for MXF as for other videos', () => {
        expect(canGenerateRendition('application/mxf', ImageRenditionFormat.jpeg)).toBe(true);
        expect(canGenerateRendition('application/mxf', ImageRenditionFormat.png)).toBe(true);
        expect(canGenerateRendition('application/mxf', ImageRenditionFormat.webp)).toBe(false);
    });
});
