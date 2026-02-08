'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Plus, Layers } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import { Modal } from '@/components/ui/Modal';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { MemoryStagesWidget } from '@/components/features/dashboard/MemoryStagesWidget';
import { ReviewForecastWidget } from '@/components/features/dashboard/ReviewForecastWidget';
import { CardPreview } from '@/components/features/decks/CardPreview';
import { CardViewerModal } from '@/components/features/decks/CardViewerModal';
import Link from 'next/link';

interface CardFormData {
    front: string;
    back: string;
}

export default function DeckDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const deckId = id as Id<"decks">;

    const timeZone =
        typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : "UTC";

    const deckWithCards = useQuery(api.decks.getWithCards, { id: deckId });
    const deckStats = useQuery(api.stats.deckStats, { deckId, timeZone });
    const updateDeckMutation = useMutation(api.decks.update);
    const deleteDeckMutation = useMutation(api.decks.remove);
    const addCardMutation = useMutation(api.cards.create);
    const updateCardMutation = useMutation(api.cards.update);
    const deleteCardMutation = useMutation(api.cards.remove);

    const [editingName, setEditingName] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [deckName, setDeckName] = useState('');
    const [deckDescription, setDeckDescription] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCardId, setEditingCardId] = useState<Id<"cards"> | null>(null);
    const [cardForm, setCardForm] = useState<CardFormData>({ front: '', back: '' });
    const [isDeleteDeckModalOpen, setIsDeleteDeckModalOpen] = useState(false);
    const [isDeleteCardModalOpen, setIsDeleteCardModalOpen] = useState(false);
    const [cardToDeleteId, setCardToDeleteId] = useState<Id<"cards"> | null>(null);
    const [viewingCardIndex, setViewingCardIndex] = useState<number | null>(null);

    const nameInputRef = useRef<HTMLInputElement>(null);
    const descInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (deckWithCards) {
            setDeckName(deckWithCards.name);
            setDeckDescription(deckWithCards.description ?? '');
        }
    }, [deckWithCards]);

    useEffect(() => {
        if (editingName) nameInputRef.current?.focus();
    }, [editingName]);

    useEffect(() => {
        if (editingDescription) descInputRef.current?.focus();
    }, [editingDescription]);

    if (deckWithCards === undefined) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Deck" backHref="/decks" backLabel="Decks" />
                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <PageLoader message="Loading…" />
                </main>
            </div>
        );
    }

    if (deckWithCards === null) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Deck" backHref="/decks" backLabel="Decks" />
                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-text-primary mb-4">Deck not found</h1>
                        <Link
                            href="/decks"
                            className="inline-block bg-accent-primary text-text-inverse px-4 py-2 rounded-md hover:bg-accent-primary-hover transition-colors cursor-pointer"
                        >
                            Back to Decks
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    const cards = deckWithCards.cards;
    const dueCount = cards.filter((c) => !c.nextReview || c.nextReview <= Date.now()).length;
    const hasDue = dueCount > 0;

    const handleSaveName = async () => {
        const name = deckName.trim();
        setEditingName(false);
        if (!name) {
            setDeckName(deckWithCards.name);
            return;
        }
        if (name !== deckWithCards.name) {
            await updateDeckMutation({ id: deckId, name, description: deckWithCards.description ?? '' });
        }
    };

    const handleSaveDescription = async () => {
        setEditingDescription(false);
        const description = deckDescription.trim();
        if (description !== (deckWithCards.description ?? '')) {
            await updateDeckMutation({ id: deckId, name: deckWithCards.name, description: description || undefined });
        }
    };

    const handleAddCard = async () => {
        if (cardForm.front.trim() && cardForm.back.trim()) {
            await addCardMutation({
                deckId,
                front: cardForm.front.trim(),
                back: cardForm.back.trim(),
            });
            setCardForm({ front: '', back: '' });
            setIsAddModalOpen(false);
        }
    };

    const handleEditCard = async () => {
        if (editingCardId && cardForm.front.trim() && cardForm.back.trim()) {
            await updateCardMutation({
                id: editingCardId,
                front: cardForm.front.trim(),
                back: cardForm.back.trim(),
            });
            setEditingCardId(null);
            setCardForm({ front: '', back: '' });
        }
    };

    const handleDeleteCardConfirm = async () => {
        if (cardToDeleteId) {
            await deleteCardMutation({ id: cardToDeleteId });
            setCardToDeleteId(null);
            setIsDeleteCardModalOpen(false);
        }
    };

    const handleDeleteDeckConfirm = async () => {
        await deleteDeckMutation({ id: deckId });
        setIsDeleteDeckModalOpen(false);
        router.push('/decks');
    };

    const openEditModal = (card: (typeof cards)[number]) => {
        setEditingCardId(card._id);
        setCardForm({ front: card.front, back: card.back });
    };

    const openDeleteCardModal = (cardId: Id<"cards">) => {
        setCardToDeleteId(cardId);
        setIsDeleteCardModalOpen(true);
    };

    const closeModals = () => {
        setIsAddModalOpen(false);
        setEditingCardId(null);
        setCardForm({ front: '', back: '' });
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <AppHeader title={deckWithCards.name} backHref="/decks" backLabel="Decks" />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Section A: Deck Header */}
                <section className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                        <div className="min-w-0 flex-1">
                            {editingName ? (
                                <input
                                    ref={nameInputRef}
                                    type="text"
                                    value={deckName}
                                    onChange={(e) => setDeckName(e.target.value)}
                                    onBlur={handleSaveName}
                                    onKeyDown={(e) => e.key === 'Enter' && nameInputRef.current?.blur()}
                                    className="w-full text-2xl font-bold text-text-primary bg-surface-secondary border border-border-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setEditingName(true)}
                                    className="group flex items-center gap-2 text-left w-full rounded-lg hover:bg-surface-secondary/50 transition-colors -mx-1 px-1 py-0.5"
                                >
                                    <h1 className="text-2xl font-bold text-text-primary truncate">
                                        {deckWithCards.name}
                                    </h1>
                                    <Pencil className="w-4 h-4 shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                                </button>
                            )}
                            {editingDescription ? (
                                <textarea
                                    ref={descInputRef}
                                    value={deckDescription}
                                    onChange={(e) => setDeckDescription(e.target.value)}
                                    onBlur={handleSaveDescription}
                                    rows={2}
                                    className="mt-2 w-full text-text-secondary bg-surface-secondary border border-border-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                                    placeholder="Add a description…"
                                />
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setEditingDescription(true)}
                                    className="group flex items-start gap-2 text-left w-full rounded-lg hover:bg-surface-secondary/50 transition-colors -mx-1 px-1 py-0.5 mt-1"
                                >
                                    <span className="text-text-secondary text-sm flex-1 min-w-0 line-clamp-2">
                                        {deckWithCards.description?.trim() || 'Add a description…'}
                                    </span>
                                    <Pencil className="w-3.5 h-3.5 shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" aria-hidden />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {hasDue ? (
                                <Link
                                    href={`/decks/${deckId}/study`}
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-primary text-text-inverse hover:bg-accent-primary-hover transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface-primary"
                                >
                                    Study
                                </Link>
                            ) : (
                                <span
                                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-tertiary text-text-tertiary cursor-not-allowed"
                                    title="No cards due for review"
                                >
                                    Study
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsDeleteDeckModalOpen(true)}
                                className="p-2.5 rounded-lg text-text-secondary hover:text-accent-error hover:bg-accent-error/10 transition-colors cursor-pointer"
                                aria-label="Delete deck"
                            >
                                <Trash2 className="w-4 h-4" aria-hidden />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-tertiary">
                        <span className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4" aria-hidden />
                            {cards.length} cards
                        </span>
                        {hasDue && (
                            <span className="text-accent-primary font-medium">
                                {dueCount} ready to review
                            </span>
                        )}
                    </div>
                </section>

                {/* Section B: Stats Widgets */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {deckStats ? (
                        <>
                            <MemoryStagesWidget data={deckStats.memoryStages} />
                            <ReviewForecastWidget data={deckStats.reviewForecast} />
                        </>
                    ) : (
                        <>
                            <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm min-h-[200px] flex items-center justify-center">
                                <span className="text-text-tertiary text-sm">Loading stats…</span>
                            </div>
                            <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm min-h-[200px] flex items-center justify-center">
                                <span className="text-text-tertiary text-sm">Loading stats…</span>
                            </div>
                        </>
                    )}
                </section>

                {/* Section C: Card Browser */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-text-primary">Cards</h2>
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-accent-primary text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-primary-hover transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface-primary"
                        >
                            <Plus className="w-4 h-4" aria-hidden />
                            Add Card
                        </button>
                    </div>

                    {cards.length === 0 ? (
                        <div className="rounded-xl border border-border-primary bg-surface-primary p-12 text-center">
                            <p className="text-text-secondary mb-4">No cards in this deck yet.</p>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-accent-primary text-text-inverse px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-primary-hover transition-colors cursor-pointer"
                            >
                                Add Your First Card
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {cards.map((card, index) => (
                                <CardPreview
                                    key={card._id}
                                    front={card.front}
                                    index={index}
                                    onClick={() => setViewingCardIndex(index)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* Card Viewer Modal */}
            <CardViewerModal
                cards={cards}
                initialIndex={viewingCardIndex ?? 0}
                isOpen={viewingCardIndex !== null}
                onClose={() => setViewingCardIndex(null)}
                onEdit={(card) => {
                    setViewingCardIndex(null);
                    openEditModal(card);
                }}
                onDelete={(cardId) => {
                    setViewingCardIndex(null);
                    openDeleteCardModal(cardId);
                }}
            />

            {/* Add Card Modal */}
            <Modal isOpen={isAddModalOpen} onClose={closeModals} title="Add New Card" size="lg">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Front</label>
                        <textarea
                            value={cardForm.front}
                            onChange={(e) => setCardForm((prev) => ({ ...prev, front: e.target.value }))}
                            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary min-h-[120px]"
                            placeholder="Enter the question or prompt"
                            rows={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Back</label>
                        <textarea
                            value={cardForm.back}
                            onChange={(e) => setCardForm((prev) => ({ ...prev, back: e.target.value }))}
                            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary min-h-[120px]"
                            placeholder="Enter the answer"
                            rows={6}
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={closeModals}
                            className="px-4 py-2 border border-border-primary rounded-lg text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleAddCard}
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-accent-primary-hover transition-colors cursor-pointer"
                        >
                            Add Card
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Card Modal */}
            <Modal
                isOpen={!!editingCardId}
                onClose={closeModals}
                title="Edit Card"
                size="lg"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Front</label>
                        <textarea
                            value={cardForm.front}
                            onChange={(e) => setCardForm((prev) => ({ ...prev, front: e.target.value }))}
                            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary min-h-[120px]"
                            placeholder="Enter the question or prompt"
                            rows={6}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Back</label>
                        <textarea
                            value={cardForm.back}
                            onChange={(e) => setCardForm((prev) => ({ ...prev, back: e.target.value }))}
                            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-surface-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary min-h-[120px]"
                            placeholder="Enter the answer"
                            rows={6}
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={closeModals}
                            className="px-4 py-2 border border-border-primary rounded-lg text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleEditCard}
                            className="bg-accent-primary text-text-inverse px-4 py-2 rounded-lg hover:bg-accent-primary-hover transition-colors cursor-pointer"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Card Confirmation Modal */}
            <Modal
                isOpen={isDeleteCardModalOpen}
                onClose={() => {
                    setIsDeleteCardModalOpen(false);
                    setCardToDeleteId(null);
                }}
                title="Delete card?"
            >
                <p className="text-text-secondary text-sm mb-6">
                    Are you sure you want to delete this card? This cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            setIsDeleteCardModalOpen(false);
                            setCardToDeleteId(null);
                        }}
                        className="px-4 py-2 border border-border-primary rounded-lg text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteCardConfirm}
                        className="px-4 py-2 rounded-lg bg-accent-error text-white hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        Delete
                    </button>
                </div>
            </Modal>

            {/* Delete Deck Confirmation Modal */}
            <Modal
                isOpen={isDeleteDeckModalOpen}
                onClose={() => setIsDeleteDeckModalOpen(false)}
                title="Delete deck?"
            >
                <p className="text-text-secondary text-sm mb-6">
                    Delete &quot;{deckWithCards.name}&quot;? This will permanently remove the deck and all its cards.
                </p>
                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={() => setIsDeleteDeckModalOpen(false)}
                        className="px-4 py-2 border border-border-primary rounded-lg text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteDeckConfirm}
                        className="px-4 py-2 rounded-lg bg-accent-error text-white hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        Delete deck
                    </button>
                </div>
            </Modal>
        </div>
    );
}
