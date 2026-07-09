import { useEffect, useState, useRef } from 'react';
import acceptedImg from '../../assets/accepted.png';
import rejectedImg from '../../assets/rejected.png';
import gtaAcceptedSound from '../../assets/gta-accepted.mp3'
import gtaRejectedSound from '../../assets/gta-rejected.mp3'
import { loadSettings } from '../settings';
import { THEMES, DEFAULT_THEME } from '../themes';




const playSound = (type: 'VICTORY' | 'DEFEAT', themeId:string) => {

  
    const theme=THEMES[themeId]||DEFAULT_THEME;

    const src= type=='VICTORY'?theme.audio.victory : theme.audio.defeat;

    const audio = new Audio(src);
    audio.volume=0.5;

    audio.play().catch(e=>console.error(e));

};


export default function MemeOverlay() {
  const [mounted, setMounted] = useState(false); // denotes if in DOM or not
  const [visible, setVisible] = useState(false); 
  const [type, setType] = useState<'VICTORY' | 'DEFEAT' | null>(null);
  const [settings, setSettings] = useState(loadSettings());

  const currentTheme=THEMES[settings.theme]||THEMES[DEFAULT_THEME];

  useEffect(() => {

    const updateSettings = (e:any)=>setSettings(e.detail);
    window.addEventListener('codeleet-settings-change',updateSettings);
    return ()=>window.removeEventListener('codeleet-settings-change',updateSettings);


  }, [])
  
  
  useEffect(() => {
    
    // @ts-ignore
    const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const handleSubmission = (e: any) => {
      const { status } = e.detail;
      
      let newType: 'VICTORY' | 'DEFEAT' | null = null;
      if (status === 10) newType = 'VICTORY';
      else if ([11, 14, 15, 20].includes(status)) newType = 'DEFEAT';

      if (newType) {

        if(settings.overlayEnabled){
          setType(newType);
          setMounted(true);
          setTimeout(() => setVisible(true), 50);

        }
        

        if(settings.soundEnabled){
          playSound(newType, settings.theme);
        }


        setTimeout(() => {
          setVisible(false); 
          setTimeout(() => setMounted(false), 500); 
        }, 3000);
      }
    };

    targetWindow.addEventListener('leetcode-submission', handleSubmission);
    return () => targetWindow.removeEventListener('leetcode-submission', handleSubmission);
  }, [settings]);

  if (!mounted || !type) return null;

  return (
    <div 
      className={`fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm transition-opacity duration-500 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className={`relative flex flex-col items-center transition-transform duration-500 ${visible ? 'scale-100' : 'scale-90'}`}>
        
        <img 
          src={type === 'VICTORY' ? currentTheme.images.victory : currentTheme.images.defeat} 
          alt={type}
          className="max-w-[600px] w-full rounded-xl shadow-2xl border-4 border-white/10"
        />
        
        {/* <h1 className="mt-4 text-5xl font-extrabold text-white tracking-widest uppercase drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] font-serif">
          {type === 'VICTORY' ? 'ACCEPTED' : 'WASTED'}
        </h1> */}
      </div>
    </div>
  );
}