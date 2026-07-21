'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Pencil, Trash2, Plus, Layers } from 'lucide-react';
import { useDeck, useDeckStats, useDeckIntervalStats, useUpdateDeck, useDeleteDeck, useCreateCard, useUpdateCard, useDeleteCard, type Card } from '@/lib/hooks';
import { useDebounce } from '@/lib/useDebounce';
import { filterDeckCards, type CardSortKey, type DueFilter, type StageFilter } from '@/lib/filterDeckCards';
import { startOfTodayInTimezone } from '@/lib/startOfToday';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { getMemoryStage, getCardTier } from '@/lib/memoryStage';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { MemoryStagesWidget } from '@/components/features/dashboard/MemoryStagesWidget';
import { ReviewForecastWidget } from '@/components/features/dashboard/ReviewForecastWidget';
import { IntervalStatsWidget } from '@/components/features/dashboard/IntervalStatsWidget';
import { CardPreview } from '@/components/features/decks/CardPreview';
import { CardViewerModal } from '@/components/features/decks/CardViewerModal';
import { CardEditForm } from '@/components/features/decks/CardEditForm';
import { CardBrowserFilters } from '@/components/features/decks/CardBrowserFilters';
import { ExportDeckButton } from '@/components/features/decks/ExportDeckButton';
import { TierBadge } from '@/components/ui/TierBadge';
import Link from 'next/link';

interface CardFormData {
    front: string;
    back: string;
}

export default function DeckDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const deckId = Number(id as string);

    const timeZone =
        typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : "UTC";

    const { toast } = useToast();

    const { data: deckWithCards, isLoading } = useDeck(deckId);
    const { data: deckStats } = useDeckStats(deckId, timeZone);
    const { data: deckIntervals } = useDeckIntervalStats(deckId, timeZone);
    const updateDeckMutation = useUpdateDeck(deckId);
    const deleteDeckMutation = useDeleteDeck();
    const addCardMutation = useCreateCard(deckId);
    const updateCardMutation = useUpdateCard(deckId);
    const deleteCardMutation = useDeleteCard(deckId);

    const [editingName, setEditingName] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [deckName, setDeckName] = useState('');
    const [deckDescription, setDeckDescription] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState<CardFormData>({ front: '', back: '' });
    const [isDeleteDeckModalOpen, setIsDeleteDeckModalOpen] = useState(false);
    const [isDeleteCardModalOpen, setIsDeleteCardModalOpen] = useState(false);
    const [cardToDeleteId, setCardToDeleteId] = useState<number | null>(null);
    const [isDeletingCard, setIsDeletingCard] = useState(false);
    const [isDeletingDeck, setIsDeletingDeck] = useState(false);
    // Track the viewed card by id (not index) so sort-only changes keep the
    // same card in view — its position in viewerCards just updates.
    const [viewingCardId, setViewingCardId] = useState<number | null>(null);
    const [showingCardInfo, setShowingCardInfo] = useState(false);
    const [infoCardId, setInfoCardId] = useState<number | null>(null);

    // ── Card browser filters ────────────────────────────────────────────────
    const [filterQuery, setFilterQuery] = useState('');
    const [stageFilter, setStageFilter] = useState<StageFilter>('all');
    const [dueFilter, setDueFilter] = useState<DueFilter>('all');
    const [sortKey, setSortKey] = useState<CardSortKey>('oldest');
    const debouncedQuery = useDebounce(filterQuery, 200);

    // Recompute start-of-today once per render. Fine to recompute — it's cheap
    // and stays consistent across renders within the same calendar day. We
    // also key the memo on the current calendar date in the user's tz so it
    // recomputes when `now` crosses into a new day (e.g. the user leaves the
    // page open past midnight); within the same day the result is identical
    // so the extra work is a no-op.
    const now = Date.now();
    const startOfTodayMs = useMemo(
        () => startOfTodayInTimezone(timeZone),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [timeZone, new Date(now).toLocaleDateString('en-CA', { timeZone })]
    );

    const allCards: Card[] = useMemo(
        () => deckWithCards?.cards ?? [],
        [deckWithCards]
    );

    const filteredCards = useMemo(
        () => filterDeckCards(allCards, {
            query: debouncedQuery,
            stageFilter,
            dueFilter,
            sortKey,
            startOfTodayMs,
        }),
        [allCards, debouncedQuery, stageFilter, dueFilter, sortKey, startOfTodayMs]
    );

    // Cards passed to the viewer modal — the filtered set (in the same
    // order the grid displays it) when filters are active, otherwise the
    // full deck. The viewer's arrow-key navigation walks this list, so it
    // must match the grid's sort order. Map the filtered DeckCardOutput
    // back to the original Card objects (which carry Date fields the
    // viewer modal needs) by id.
    const cardsById = useMemo(
        () => new Map(allCards.map((c) => [c.id, c])),
        [allCards]
    );
    const viewerCards: Card[] = useMemo(
        () => filteredCards.length < allCards.length
            ? filteredCards.map((c) => cardsById.get(c.id)).filter((c): c is Card => c !== undefined)
            : allCards,
        [filteredCards, allCards, cardsById]
    );

    // Close the viewer if filters change the membership of the visible
    // set. Sort-only changes don't alter which cards are visible, so we
    // intentionally exclude `sortKey` — the viewer stays on the same
    // card (tracked by id) and walks viewerCards in the new sorted order.
    useEffect(() => {
        setViewingCardId(null);
        setShowingCardInfo(false);
    }, [debouncedQuery, stageFilter, dueFilter]);

    // Resolve the viewed card's id to an index into viewerCards. Recompute
    // whenever the set or order changes — e.g. a sort change moves the
    // viewed card to a different index, and we want the viewer to follow it.
    const viewingCardIndex = useMemo(() => {
        if (viewingCardId === null) return null;
        const idx = viewerCards.findIndex((c) => c.id === viewingCardId);
        return idx === -1 ? null : idx;
    }, [viewingCardId, viewerCards]);

    const infoCardIndex = useMemo(() => {
        if (infoCardId === null || viewerCards.length === 0) return 0;
        const idx = viewerCards.findIndex((c) => c.id === infoCardId);
        return idx === -1 ? 0 : idx;
    }, [infoCardId, viewerCards]);

    // Track the currently-viewed card by id as the user navigates inside the
    // viewer. Stabilized with useCallback so CardViewerModal's navigation
    // effect doesn't re-fire on every parent render.
    const handleViewerNavigate = useCallback(
        (index: number) => {
            const card = viewerCards[index];
            if (card) setViewingCardId(card.id);
        },
        [viewerCards]
    );

    const handleClearFilters = () => {
        setFilterQuery('');
        setStageFilter('all');
        setDueFilter('all');
        setSortKey('oldest');
    };

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
        if (editingDescription && descInputRef.current) {
            descInputRef.current.focus();
            // Move cursor to the end of the text
            descInputRef.current.setSelectionRange(descInputRef.current.value.length, descInputRef.current.value.length);
        }
    }, [editingDescription]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Deck" backHref="/decks" backLabel="Decks" />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <PageLoader message="Loading…" />
                </main>
            </div>
        );
    }

    if (!deckWithCards) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <AppHeader title="Deck" backHref="/decks" backLabel="Decks" />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
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

    const cards: Card[] = deckWithCards.cards;
    const dueCount = cards.filter((c) => new Date(c.nextReview).getTime() <= now).length;
    const hasDue = dueCount > 0;

    const handleSaveName = async () => {
        const name = deckName.trim();
        setEditingName(false);
        if (!name) {
            setDeckName(deckWithCards.name);
            return;
        }
        if (name !== deckWithCards.name) {
            try {
                await updateDeckMutation.mutateAsync({ name, description: deckWithCards.description ?? '' });
                toast.success('Deck name updated');
            } catch (err) {
                setDeckName(deckWithCards.name);
                toast.error(err instanceof Error ? err.message : 'Failed to update deck name');
            }
        }
    };

    const handleSaveDescription = async () => {
        setEditingDescription(false);
        const description = deckDescription.trim();
        if (description !== (deckWithCards.description ?? '')) {
            try {
                await updateDeckMutation.mutateAsync({ name: deckWithCards.name, description: description || undefined });
                toast.success('Description updated');
            } catch (err) {
                setDeckDescription(deckWithCards.description ?? '');
                toast.error(err instanceof Error ? err.message : 'Failed to update description');
            }
        }
    };

    const handleAddCard = async () => {
        if (addForm.front.trim() && addForm.back.trim()) {
            try {
                await addCardMutation.mutateAsync({
                    front: addForm.front.trim(),
                    back: addForm.back.trim(),
                });
                toast.success('Card added');
                setAddForm({ front: '', back: '' });
                setIsAddModalOpen(false);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to add card');
            }
        }
    };

    const handleEditCard = async (card: Card, front: string, back: string) => {
        if (front.trim() && back.trim()) {
            try {
                await updateCardMutation.mutateAsync({
                    cardId: card.id,
                    front: front.trim(),
                    back: back.trim(),
                });
                toast.success('Card saved');
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to save card');
            }
        }
    };

    const handleDeleteCardConfirm = async () => {
        if (cardToDeleteId) {
            setIsDeletingCard(true);
            try {
                await deleteCardMutation.mutateAsync(cardToDeleteId);
                toast.success('Card deleted');
                setCardToDeleteId(null);
                setIsDeleteCardModalOpen(false);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to delete card');
            } finally {
                setIsDeletingCard(false);
            }
        }
    };

    const handleDeleteDeckConfirm = async () => {
        setIsDeletingDeck(true);
        try {
            await deleteDeckMutation.mutateAsync(deckId);
            setIsDeleteDeckModalOpen(false);
            router.push('/decks');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete deck');
            setIsDeletingDeck(false);
        }
    };

    const openDeleteCardModal = (cardId: number) => {
        setCardToDeleteId(cardId);
        setIsDeleteCardModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setAddForm({ front: '', back: '' });
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <AppHeader title={deckWithCards.name} backHref="/decks" backLabel="Decks" />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                            <ExportDeckButton
                                deckName={deckWithCards.name}
                                description={deckWithCards.description ?? undefined}
                                cards={cards.map((c) => ({
                                    front: c.front,
                                    back: c.back,
                                    efactor: c.efactor,
                                    repetitions: c.repetitions,
                                    nextReview: new Date(c.nextReview).getTime(),
                                    lastStudied: c.lastStudied ? new Date(c.lastStudied).getTime() : undefined,
                                }))}
                            />
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
                {deckIntervals && (
                    <section className="mb-6">
                        <IntervalStatsWidget data={deckIntervals} />
                    </section>
                )}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    {deckStats ? (
                        <>
                            <MemoryStagesWidget data={deckStats.memoryStages} />
                            <ReviewForecastWidget data={deckStats.reviewForecast} timeZone={timeZone} />
                        </>
                    ) : (
                        <>
                            <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm min-h-44 flex items-center justify-center">
                                <span className="text-text-tertiary text-sm">Loading stats…</span>
                            </div>
                            <div className="rounded-xl border border-border-primary bg-surface-primary p-5 shadow-sm min-h-44 flex items-center justify-center">
                                <span className="text-text-tertiary text-sm">Loading stats…</span>
                            </div>
                        </>
                    )}
                </section>

                {/* Section C: Card Browser */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-text-primary">Cards</h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex items-center gap-2 bg-accent-primary text-text-inverse px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-primary-hover transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface-primary"
                            >
                                <Plus className="w-4 h-4" aria-hidden />
                                Add Card
                            </button>
                        </div>
                    </div>

                    {cards.length === 0 ? (
                        <div className="rounded-xl border border-border-primary bg-surface-primary p-12 text-center">
                            <p className="text-text-secondary mb-4">No cards in this deck yet.</p>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                className="bg-accent-primary text-text-inverse px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-primary-hover transition-colors cursor-pointer"
                            >
                                Add Your First Card
                            </button>
                        </div>
                    ) : (
                        <>
                            <CardBrowserFilters
                                query={filterQuery}
                                onQueryChange={setFilterQuery}
                                stageFilter={stageFilter}
                                onStageFilterChange={setStageFilter}
                                dueFilter={dueFilter}
                                onDueFilterChange={setDueFilter}
                                sortKey={sortKey}
                                onSortKeyChange={setSortKey}
                                totalCount={cards.length}
                                filteredCount={filteredCards.length}
                                onClear={handleClearFilters}
                            />

                            <div className="mt-4">
                                {filteredCards.length === 0 ? (
                                    <div className="rounded-xl border border-border-primary bg-surface-primary p-12 text-center">
                                        <p className="text-text-secondary mb-4">No cards match these filters.</p>
                                        <button
                                            type="button"
                                            onClick={handleClearFilters}
                                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium
                                                       border border-border-primary text-text-primary bg-surface-secondary
                                                       hover:bg-surface-tertiary transition-colors cursor-pointer
                                                       focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                        >
                                            Clear filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredCards.map((card, gridIndex) => {
                                            return (
                                                <CardPreview
                                                    key={card.id}
                                                    front={card.front}
                                                    index={gridIndex}
                                                    repetitions={card.repetitions}
                                                    onClick={() => {
                                                        setViewingCardId(card.id);
                                                        setShowingCardInfo(false);
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </section>
            </main>

            {/* Card Viewer Modal — walks the filtered list when filters active */}
            <CardViewerModal
                cards={viewerCards}
                initialIndex={viewingCardIndex ?? 0}
                isOpen={viewingCardIndex !== null}
                onClose={() => {
                    setViewingCardId(null);
                    setShowingCardInfo(false);
                }}
                onEdit={handleEditCard}
                onDelete={(cardId) => {
                    setViewingCardId(null);
                    openDeleteCardModal(cardId);
                }}
                infoContent={
                    viewingCardIndex !== null && showingCardInfo && viewerCards.length > 0 ? (() => {
                        const safeInfoIndex = Math.min(infoCardIndex, viewerCards.length - 1);
                        const infoCard = viewerCards[safeInfoIndex];
                        const reps = infoCard.repetitions;
                        const tier = getCardTier(reps);
                        const stage = getMemoryStage(reps);
                        const nextReviewMs = new Date(infoCard.nextReview).getTime();
                        const nextReviewLabel =
                            nextReviewMs <= now
                                ? 'Due for review'
                                : new Date(nextReviewMs).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                        return (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">Tier</h3>
                                    <TierBadge tier={tier} variant="chip" />
                                    <p className="text-xs text-text-tertiary mt-2">{stage} stage</p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Next review</h3>
                                    <p className="text-text-primary font-medium">{nextReviewLabel}</p>
                                </div>
                            </div>
                        );
                    })() : null
                }
                onCancelInfo={() => setShowingCardInfo(false)}
                onShowInfo={(index) => {
                    const card = viewerCards[index];
                    if (card) setInfoCardId(card.id);
                    setShowingCardInfo(true);
                }}
                onNavigate={handleViewerNavigate}
            />

            {/* Add Card Modal */}
            <Modal isOpen={isAddModalOpen} onClose={closeAddModal} title="Add New Card" size="lg">
                <CardEditForm
                    front={addForm.front}
                    back={addForm.back}
                    onFrontChange={(v) => setAddForm((f) => ({ ...f, front: v }))}
                    onBackChange={(v) => setAddForm((f) => ({ ...f, back: v }))}
                    onCancel={closeAddModal}
                    onSave={handleAddCard}
                    saveLabel="Add Card"
                    autoFocus
                    saving={addCardMutation.isPending}
                />
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
                        className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border-primary text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteCardConfirm}
                        disabled={isDeletingCard}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-error text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isDeletingCard ? 'Deleting…' : 'Delete'}
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
                        className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border-primary text-text-primary hover:bg-surface-secondary transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteDeckConfirm}
                        disabled={isDeletingDeck}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-error text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isDeletingDeck ? 'Deleting…' : 'Delete deck'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}