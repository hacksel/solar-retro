export type DecorationType = 'bright' | 'black' | 'gift' | 'star';

export interface Position {
    x: number;
    y: number;
}

export interface Decoration {
    id: string;
    roomId?: string;
    type: DecorationType;
    message: string;
    position: Position;
    author: string;
    createdAt?: number;
}
