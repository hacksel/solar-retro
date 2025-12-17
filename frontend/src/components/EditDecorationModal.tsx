import React, { useState } from 'react';
import type { Decoration } from '../types';

interface EditDecorationModalProps {
    decoration: Decoration;
    onClose: () => void;
    onUpdate: (dec: Decoration) => void;
    onDelete: (id: string) => void;
}

export const EditDecorationModal: React.FC<EditDecorationModalProps> = ({ decoration, onClose, onUpdate, onDelete }) => {
    const [message, setMessage] = useState(decoration.message);

    const handleSave = () => {
        onUpdate({
            ...decoration,
            message
        });
        onClose();
    };

    const handleDelete = () => {
        if (confirm("Are you sure you want to delete this decoration?")) {
            onDelete(decoration.id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl max-w-sm w-full p-6 shadow-2xl border border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Edit Decoration</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-gray-400">Message</label>
                    <textarea
                        className="w-full h-32 bg-gray-900 border border-gray-700 rounded p-3 text-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
                    >
                        Delete
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
