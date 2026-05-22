
export interface Menu{
    menu_id: string;
    name: string;
    short_desc: string;
    long_desc: string | null;
    available_from: string;
    available_until: string;
    is_active: boolean;
    rules : null
}

export interface CreateMenuState{
    name: string
    short_desc:string,
    long_desc: string,
    available_from: string,
    available_until: string,
    is_active: boolean,
    rules: null
}
