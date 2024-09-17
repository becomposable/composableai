
import sharp from "sharp";


/**
 * Resizes an image to a maximum height or width
 * @param max_hw 
 * @param format 
 * @returns 
 */
export function imageResizer(max_hw: number, format: keyof sharp.FormatEnum) {

    return sharp().resize({
        width: max_hw,
        height: max_hw,
        fit: sharp.fit.inside,
        withoutEnlargement: true,

    }).toFormat(format);

}

