import gtaAcceptedImg from '../assets/gta-accepted-img.png'
import gtaRejectedImg from '../assets/gta-rejected-img.png'
import gtaAcceptedVoice from '../assets/gta-accepted.mp3'
import gtaRejectedVoice from '../assets/gta-rejected.mp3'

import minecraftAcceptedImg from '../assets/minecraft-accepted-img.jpg'
import minecraftRejectedImg from '../assets/minecraft-rejected-img.jpg'
import minecraftAcceptedVoice from '../assets/minecraft-accepted.mp3'
import minecraftRejectedVoice from '../assets/minecraft-rejected.mp3'






export interface themeAssets{
    name:string;
    images:{
        victory:string,
        defeat:string,
    };

    audio:{
        victory:string,
        defeat:string,
    };

    styleClass?:string;
}


export const THEMES :Record<string,themeAssets>={

    gta: {
    name: 'Grand Theft Auto',
    images: { victory: gtaAcceptedImg, defeat: gtaRejectedImg },
    audio: { victory: gtaAcceptedVoice, defeat:gtaRejectedVoice },
    styleClass: 'font-serif tracking-widest' // Example styling
  },
  minecraft: {
    name: 'Minecraft',
    images: { victory: minecraftAcceptedImg, defeat:minecraftRejectedImg },
    audio: { victory: minecraftAcceptedVoice, defeat: minecraftRejectedVoice },
    styleClass: 'font-mono tracking-normal' // Pixel font style
  },



}


export const DEFAULT_THEME='gta';



