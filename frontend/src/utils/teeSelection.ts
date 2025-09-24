// Utility functions for tee selection and HCP calculation

export interface CourseTee {
  tee_id: number;
  course_id: number;
  tee_type: 'negro' | 'azul' | 'blanco' | 'amarillo' | 'rojo';
  tee_name: string;
  slope_rating: number;
  course_rating: number;
  par: number;
  total_distance_yards: number;
  gender: 'M' | 'F' | 'both';
  handicap_min: number | null;
  handicap_max: number | null;
}

export interface Player {
  gender: 'M' | 'F' | 'Other';
  handicap_index: number;
  age?: number; // Para determinar si es senior/juvenil
}

/**
 * Determine the appropriate tee for a player based on gender, handicap, and age
 */
export function selectTeeForPlayer(player: Player, availableTees: CourseTee[]): CourseTee | null {
  const { gender, handicap_index, age } = player;
  
  // Filter tees that match gender
  const genderTees = availableTees.filter(tee => 
    tee.gender === gender || tee.gender === 'both'
  );
  
  if (genderTees.length === 0) {
    return availableTees[0] || null; // Fallback to first available
  }
  
  // For women, prefer red tees
  if (gender === 'F') {
    const redTee = genderTees.find(tee => tee.tee_type === 'rojo');
    if (redTee) return redTee;
  }
  
  // For men, select based on handicap and age
  if (gender === 'M') {
    // Check if senior/junior (yellow tees)
    if (age && (age >= 65 || age <= 18)) {
      const yellowTee = genderTees.find(tee => tee.tee_type === 'amarillo');
      if (yellowTee) return yellowTee;
    }
    
    // Professional/scratch golfers (black tees)
    if (handicap_index <= 0) {
      const blackTee = genderTees.find(tee => tee.tee_type === 'negro');
      if (blackTee) return blackTee;
    }
    
    // Low handicap (blue tees)
    if (handicap_index > 0 && handicap_index <= 10) {
      const blueTee = genderTees.find(tee => tee.tee_type === 'azul');
      if (blueTee) return blueTee;
    }
    
    // Medium/high handicap (white tees)
    if (handicap_index > 10) {
      const whiteTee = genderTees.find(tee => tee.tee_type === 'blanco');
      if (whiteTee) return whiteTee;
    }
  }
  
  // Fallback to first available tee for gender
  return genderTees[0];
}

/**
 * Calculate HCP using the correct tee data
 */
export function calculateHCPWithTee(
  handicapIndex: number, 
  tee: CourseTee
): number {
  if (!handicapIndex || handicapIndex === 0) return 0;
  
  const { slope_rating, course_rating, par } = tee;
  const hcp = handicapIndex * (slope_rating / 113) + (course_rating - par);
  
  return Math.round(hcp);
}

/**
 * Get tee color for display
 */
export function getTeeColor(teeType: string): string {
  const colors = {
    negro: '#000000',
    azul: '#0066CC',
    blanco: '#FFFFFF',
    amarillo: '#FFD700',
    rojo: '#DC2626'
  };
  
  return colors[teeType as keyof typeof colors] || '#6B7280';
}

/**
 * Get tee display name with emoji
 */
export function getTeeDisplayName(teeType: string, teeName: string): string {
  const emojis = {
    negro: '⚫',
    azul: '🔵', 
    blanco: '⚪',
    amarillo: '🟡',
    rojo: '🔴'
  };
  
  const emoji = emojis[teeType as keyof typeof emojis] || '⚪';
  return `${emoji} ${teeName}`;
}



