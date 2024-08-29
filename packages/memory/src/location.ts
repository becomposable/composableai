import { globSync } from 'glob';

export function resolveLocation(location: string): string | string[] {
    if (location.includes('*')) {
        return globSync(location, { absolute: true, withFileTypes: false });
    } else {
        return location;
    }
}