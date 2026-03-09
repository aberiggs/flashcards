export type MemoryStage = 'New' | 'Learning' | 'Reviewing' | 'Mastered';

export function getMemoryStage(repetitions: number): MemoryStage {
    if (repetitions === 0) return 'New';
    if (repetitions <= 2) return 'Learning';
    if (repetitions <= 5) return 'Reviewing';
    return 'Mastered';
}
