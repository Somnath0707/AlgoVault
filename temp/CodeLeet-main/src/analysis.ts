
// //et:5 = submission   status:10 = accepted
// //et:10 = paste
// //et:3 = tab switch



export type AnalysisStatus = 'CLEAN' | 'MILD_PASTE' | 'HEAVY_PASTE' | 'SKIPPED';

export interface CheatReport {
  status: AnalysisStatus;
  label: string; 
  color: string;
  details: string[];
  pasteCount: number;
  focusLoss: number;
}

export function analyzeEvents(events: any[]): CheatReport {

  if (!events || events.length === 0) {
    return { status: 'SKIPPED', label: 'No Data', color: 'text-gray-500', details: ['No data'], pasteCount: 0, focusLoss: 0 };
  }
  let isAccepted = false;
  let attemptStatus = null;
  for (const e of events) {
    const type = parseInt(e.eventType, 10);
    if (type === 5) {
        try {
            const data = JSON.parse(e.eventData);
            if (data.result && data.result.status === 10) { isAccepted = true; break; }
            else if (data.result) { attemptStatus = data.result.status; }
        } catch (err) {}
    }
  }
  if (!isAccepted) {
      const msg = attemptStatus ? ` Not Accepted (Status ${attemptStatus})` : ` No Submission`;
      return { status: 'SKIPPED', label: 'Skipped', color: 'text-gray-500', details: [msg], pasteCount: 0, focusLoss: 0 };
  }


  let pasteCount = 0;
  let focusLoss = 0;
  const HEAVY_THRESHOLD = 500; 
  const MILD_THRESHOLD = 100;

  const detectedPastes: string[] = [];

  events.forEach((e) => {
    const type = parseInt(e.eventType, 10);

    if (type === 3) {
      if (e.eventData.includes('"val": false') || e.eventData.includes('"val":false')) focusLoss++;
    }

    if ((type === 7 || type === 10) && e.eventData) {
      try {
        const data = JSON.parse(e.eventData);
        const isInternal = data.isFromInside === true; 

        if (data.change && data.change.changes) {
          data.change.changes.forEach((change: any) => {
            const insertedLen = (change.insert || "").length;
            if (insertedLen > 0) {
              if (isInternal) return; 

              if (insertedLen > MILD_THRESHOLD) {
                if (type === 10) { 
                   pasteCount++;
                   if (insertedLen > HEAVY_THRESHOLD) {
                     detectedPastes.push(`Large Ext. Paste!: ${insertedLen} chars`);
                   } else {
                     detectedPastes.push(`Small Ext. Paste: ${insertedLen} chars`);
                   }
                } 


                //this is causing false flags so commmenting out this logic as of now

                // else if (type === 7 && insertedLen > 800) { 
                  //  pasteCount++;
                  //  detectedPastes.push(`⚠️ Bulk Insert: ${insertedLen} chars`);
                // }
              }
            }
          });
        }
      } catch (err) {}
    }
  });

  let status: AnalysisStatus = 'CLEAN';
  let label = 'Manual Typing';
  let color = 'text-green-400';
  const details: string[] = [];

  const hasHeavyPaste = detectedPastes.some(d => d.includes('!') || d.includes('Bulk'));
  
  if (hasHeavyPaste) {
    status = 'HEAVY_PASTE';
    label = 'Large Paste'; 
    color = 'text-red-500';
    details.push(...detectedPastes);
  } 
  else if (pasteCount > 0) {
    status = 'MILD_PASTE';
    label = 'Small Paste'; 
    color = 'text-orange-400'; 
    details.push(...detectedPastes);
  }

  if (focusLoss > 10) {
     details.push(`Tab Switch: ${focusLoss}x`);
  }

  if (status === 'CLEAN') {
    details.push(`Natural typing`);
  }

  return { status, label, color, details, pasteCount, focusLoss };
}