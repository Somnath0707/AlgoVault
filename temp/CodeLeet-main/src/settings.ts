export interface AppSettings{
    overlayEnabled: boolean;
    soundEnabled: boolean;
    volume:number;
    theme:string;
}



export const DEFAULT_SETTINGS:AppSettings = {

    overlayEnabled:true,
    soundEnabled:true,
    volume:0.5,
    theme:'gta'
}



export function loadSettings():AppSettings{


    try{
        const saved=localStorage.getItem('codeleet_settings');
        return saved?JSON.parse(saved):DEFAULT_SETTINGS;
    }
    catch{
        return DEFAULT_SETTINGS;
    }

}



export function saveSettings(settings:AppSettings){

    localStorage.setItem('codeleet_settings',JSON.stringify(settings));

    window.dispatchEvent(new CustomEvent('codeleet-settings-change',{detail:settings}));

}