'use client';

import { useState } from 'react';

// TypeScript interface for a flashcard
interface Flashcard {
    id: string;
    front: string;
    back: string;
    category?: string;
}

// TypeScript interface for the form state
interface FlashcardForm {
    front: string;
    back: string;
    category: string;
}

export default function CreateFlashcardPage() {
    // State management using React hooks
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [formData, setFormData] = useState<FlashcardForm>({
        front: '',
        back: '',
        category: 'General'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.front.trim() || !formData.back.trim()) {
            alert('Please fill in both front and back of the flashcard');
            return;
        }

        setIsSubmitting(true);

        // Create new flashcard
        const newFlashcard: Flashcard = {
            id: Date.now().toString(), // Simple ID generation
            front: formData.front.trim(),
            back: formData.back.trim(),
            category: formData.category
        };

        // Add to flashcards array
        setFlashcards(prev => [...prev, newFlashcard]);

        // Reset form
        setFormData({
            front: '',
            back: '',
            category: 'General'
        });

        setIsSubmitting(false);
    };

    // Delete flashcard
    const deleteFlashcard = (id: string) => {
        setFlashcards(prev => prev.filter(card => card.id !== id));
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Create Flashcards
                    </h1>
                    <p className="text-gray-600">
                        Build your knowledge with custom flashcards
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Form Section */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                            Add New Flashcard
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Category Input */}
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <input
                                    type="text"
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Math, Science, History"
                                />
                            </div>

                            {/* Front of Card */}
                            <div>
                                <label htmlFor="front" className="block text-sm font-medium text-gray-700 mb-2">
                                    Front (Question)
                                </label>
                                <textarea
                                    id="front"
                                    name="front"
                                    value={formData.front}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Enter the question or prompt..."
                                    required
                                />
                            </div>

                            {/* Back of Card */}
                            <div>
                                <label htmlFor="back" className="block text-sm font-medium text-gray-700 mb-2">
                                    Back (Answer)
                                </label>
                                <textarea
                                    id="back"
                                    name="back"
                                    value={formData.back}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Enter the answer or explanation..."
                                    required
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSubmitting ? 'Adding...' : 'Add Flashcard'}
                            </button>
                        </form>
                    </div>

                    {/* Preview Section */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                            Your Flashcards ({flashcards.length})
                        </h2>

                        {flashcards.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No flashcards yet. Create your first one!</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {flashcards.map((card) => (
                                    <div
                                        key={card.id}
                                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                {card.category}
                                            </span>
                                            <button
                                                onClick={() => deleteFlashcard(card.id)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <span className="text-xs text-gray-500 font-medium">Front:</span>
                                                <p className="text-sm text-gray-800">{card.front}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-500 font-medium">Back:</span>
                                                <p className="text-sm text-gray-800">{card.back}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                {flashcards.length > 0 && (
                    <div className="mt-8 text-center space-x-4">
                        <button
                            onClick={() => {
                                // TODO: Implement save functionality
                                alert('Save functionality coming soon!');
                            }}
                            className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                        >
                            Save All Flashcards
                        </button>
                        <button
                            onClick={() => setFlashcards([])}
                            className="bg-red-600 text-white py-2 px-6 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

