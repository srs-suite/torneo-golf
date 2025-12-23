// Golf scoring utility functions
export function getScoreStyle(strokes: number, par: number) {
  if (strokes === 1) {
    // Hole in One
    return {
      bgColor: 'bg-yellow-400',
      textColor: 'text-white',
      borderColor: 'border-yellow-500',
      shape: 'rounded-full',
      icon: '⭐'
    };
  }
  
  const diff = strokes - par;
  
  if (diff <= -2) {
    // Eagle or better
    return {
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      borderColor: 'border-red-600',
      shape: 'rounded-full',
      icon: '🦅'
    };
  } else if (diff === -1) {
    // Birdie
    return {
      bgColor: 'bg-blue-500',
      textColor: 'text-white',
      borderColor: 'border-blue-600',
      shape: 'rounded-full',
      icon: '🐦'
    };
  } else if (diff === 0) {
    // Par
    return {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300',
      shape: 'rounded-md',
      icon: '✓'
    };
  } else if (diff === 1) {
    // Bogey
    return {
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
      shape: 'rounded-md',
      icon: '+'
    };
  } else if (diff === 2) {
    // Double Bogey
    return {
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-300',
      shape: 'rounded-md',
      icon: '++'
    };
  } else {
    // Triple Bogey or worse
    return {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
      shape: 'rounded-md',
      icon: '+++'
    };
  }
}

export function getScoreDisplayName(strokes: number, par: number): string {
  if (strokes === 1) return 'Hole in One';
  
  const diff = strokes - par;
  
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double Bogey';
  if (diff === 3) return 'Triple Bogey';
  return `+${diff} Over`;
}

