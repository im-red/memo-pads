export interface WeReadNote {
  date: string;
  explanation: string;
  originalText: string;
}

function trimExplanation(lines: string[]): string[] {
  let start = 0;
  let end = lines.length - 1;

  while (start <= end && lines[start].trim() === '') {
    start++;
  }

  while (end >= start && lines[end].trim() === '') {
    end--;
  }

  return lines.slice(start, end + 1);
}

export function parseWeReadNotes(content: string): WeReadNote[] {
  const notes: WeReadNote[] = [];
  const lines = content.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    const startMatch = line.match(/^◆\s*(\d{4}\/\d{2}\/\d{2})发表想法/);
    if (startMatch) {
      const date = startMatch[1];
      const explanationLines: string[] = [];
      let originalText = '';
      let j = i + 1;
      
      while (j < lines.length) {
        const currentLine = lines[j].trim();
        
        if (currentLine.startsWith('原文：')) {
          originalText = currentLine.replace(/^原文：/, '').trim();
          break;
        }
        
        if (!currentLine.startsWith('◆')) {
          explanationLines.push(lines[j].trim());
        }
        
        j++;
      }
      
      const trimmedExplanation = trimExplanation(explanationLines);
      
      if (originalText && trimmedExplanation.length > 0) {
        notes.push({
          date,
          explanation: trimmedExplanation.join('\n'),
          originalText
        });
      }
      
      i = j + 1;
    } else {
      i++;
    }
  }
  
  return notes;
}
