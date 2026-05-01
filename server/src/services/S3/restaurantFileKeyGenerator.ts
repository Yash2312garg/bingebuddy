export class RestaurantFileKey {
    private static generateTimestamp(): string {
        return Date.now().toString();
    }

    static createLogoKey(state: string, city: string, reference_id: string): string {
        return `${state}/${city}/${reference_id}/logo/${this.generateTimestamp()}`;
    }

    static createFullImageKey(state: string, city: string, reference_id: string): string {
        return `${state}/${city}/${reference_id}/fullImage/${this.generateTimestamp()}`;
    }

    static createMenuImageKey(state: string, city: string, reference_id: string): string {
        return `${state}/${city}/${reference_id}/menu/${this.generateTimestamp()}`;
    }

    static createDocumentKey(state: string, city: string, reference_id: string, docType: string): string {
        return `${state}/${city}/${reference_id}/documents/${docType}/${this.generateTimestamp()}`;
    }

    // Generic key generator
    static createCustomKey(
        state: string, 
        city: string, 
        reference_id: string, 
        folder: string, 
        filename?: string
    ): string {
        const timestamp = this.generateTimestamp();
        const finalFilename = filename || timestamp;
        return `${state}/${city}/${reference_id}/${folder}/${finalFilename}`;
    }
}