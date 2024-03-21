
export function textToPascalCase(text: string) {
    return text.trim().split(/\W/).map(w => w ? w[0].toUpperCase() + w.substring(1) : '').join('')
}
