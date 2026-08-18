"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar, Topbar } from "@/components/dashboard";
import {
  AlertTriangle,
  Calendar,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  deleteForever as deleteForeverRequest,
  emptyTrash as emptyTrashRequest,
  fetchTrash,
  restoreItem as restoreItemRequest,
  trashLibraryItem,
  trashProject,
} from "@/lib/dashboard/api";
import {
  formatSize,
  getIconForKind,
  KIND_LABEL,
  matchesSearch,
  type TrashItem,
} from "@/lib/dashboard/types";

/* ===================================================== */
/* TRASH ROW                                            */
/* ===================================================== */

function TrashRow({
  item,
  onRestore,
  onDelete,
}: {
  item: TrashItem;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const Icon = getIconForKind(item.kind, item.name);
  const isExpiringSoon = item.daysUntilPurge <= 7;

  return (
    <div
      className="
        group
        flex
        min-w-0
        items-center
        gap-3
        px-4
        py-3.5
        transition-colors
        hover:bg-paper-raised
        sm:gap-4
        sm:px-6
        dark:hover:bg-ink-raised
      "
    >
      <span
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          border
          border-amber/20
          bg-amber/10
          text-amber
        "
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-graphite dark:text-mist">
          {item.name}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-graphite-muted dark:text-mist-muted">
          <span className="font-mono text-[8px] uppercase tracking-[0.1em]">
            {KIND_LABEL[item.kind]}
          </span>
          <span
            aria-hidden="true"
            className="h-0.5 w-0.5 shrink-0 rounded-full bg-graphite-faint dark:bg-mist-faint"
          />
          <span>{formatSize(item.sizeBytes)}</span>
        </p>
      </div>

      <div className="hidden min-w-0 flex-col items-end sm:flex">
        <p className="flex items-center gap-1.5 text-[11px] text-graphite-muted dark:text-mist-muted">
          <Calendar className="h-3 w-3" strokeWidth={1.6} />
          {item.deletedOn}
        </p>
        <p
          className={`mt-0.5 font-mono text-[8px] uppercase tracking-[0.12em] ${isExpiringSoon ? "text-coral" : "text-graphite-faint dark:text-mist-faint"
            }`}
        >
          {item.daysUntilPurge} days left
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onRestore}
          aria-label={`Restore ${item.name}`}
          className="
            flex
            h-8
            items-center
            gap-1.5
            rounded-full
            border
            border-paper-border
            bg-paper-surface
            px-3
            text-[11px]
            font-medium
            text-graphite-muted
            transition-all
            duration-200
            hover:border-amber/50
            hover:text-amber
            dark:border-ink-border
            dark:bg-ink-surface
            dark:text-mist-muted
            dark:hover:border-amber/50
            dark:hover:text-amber
          "
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.7} />
          <span className="hidden sm:inline">Restore</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${item.name} forever`}
          className="
            flex
            h-8
            items-center
            justify-center
            rounded-full
            border
            border-transparent
            bg-coral/10
            px-2.5
            text-coral
            transition-all
            duration-200
            hover:bg-coral
            hover:text-ink
          "
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
        </button>
      </div>
    </div>
  );
}

/* ===================================================== */
/* CONFIRM DIALOG                                        */
/* ===================================================== */

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
    >
      <div
        aria-hidden="true"
        onClick={onCancel}
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
      />

      <div
        className="
          relative
          w-full
          max-w-sm
          rounded-xl
          border
          border-paper-border
          bg-paper-surface
          p-5
          shadow-[0_24px_70px_rgba(0,0,0,0.18)]
          dark:border-ink-border
          dark:bg-ink-surface
          dark:shadow-[0_24px_70px_rgba(0,0,0,0.5)]
        "
      >
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-coral/25 bg-coral/10 text-coral">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.7} />
        </span>

        <h2 className="font-display text-lg font-semibold tracking-[-0.03em] text-graphite dark:text-mist">
          {title}
        </h2>

        <p className="mt-2 text-[13px] leading-6 text-graphite-muted dark:text-mist-muted">
          {message}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="
              h-10
              flex-1
              rounded-full
              border
              border-paper-border
              text-[13px]
              font-medium
              text-graphite
              transition-colors
              duration-200
              hover:border-amber/50
              hover:text-amber
              dark:border-ink-border
              dark:text-mist
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="
              h-10
              flex-1
              rounded-full
              bg-coral
              text-[13px]
              font-semibold
              text-ink
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:shadow-[0_6px_20px_rgba(239,111,108,0.3)]
              active:translate-y-0
            "
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* PAGE                                                 */
/* ===================================================== */

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [lastAction, setLastAction] = useState<{
    message: string;
    restore: TrashItem[];
  } | null>(null);

  const load = useCallback(async () => {
    setActionError(null);

    try {
      setItems(await fetchTrash());
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not load the trash."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(
    () => items.filter((item) => matchesSearch(item, searchQuery)),
    [items, searchQuery]
  );

  const restoreItem = async (item: TrashItem) => {
    if (isBusy) return;

    setIsBusy(true);
    setActionError(null);

    try {
      await restoreItemRequest(item.id);

      setItems((previous) => previous.filter((entry) => entry.id !== item.id));
      setLastAction({
        message: `Restored ${item.name}`,
        restore: [item],
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not restore that item."
      );
    } finally {
      setIsBusy(false);
    }
  };

  const deleteItem = async (item: TrashItem) => {
    if (isBusy) return;

    setIsBusy(true);
    setActionError(null);

    try {
      await deleteForeverRequest(item.id);

      setItems((previous) => previous.filter((entry) => entry.id !== item.id));
      setPendingDeleteId(null);
      // Permanent deletion is intentionally NOT undoable.
      setLastAction(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not delete that item."
      );
    } finally {
      setIsBusy(false);
    }
  };

  const emptyTrash = async () => {
    if (isBusy) return;

    setIsBusy(true);
    setActionError(null);

    try {
      await emptyTrashRequest();

      setItems([]);
      setIsEmptyingTrash(false);
      setLastAction(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not empty the trash."
      );
      setIsEmptyingTrash(false);
    } finally {
      setIsBusy(false);
    }
  };

  /**
   * Undo of a restore = put the item straight back in the trash.
   *
   * The restored document keeps its original id, so re-trashing it by that id
   * lands it back where it was rather than creating a second copy.
   */
  const undoLastAction = async () => {
    if (!lastAction || isBusy) return;

    setIsBusy(true);
    setActionError(null);

    try {
      await Promise.all(
        lastAction.restore.map((item) =>
          item.origin === "library"
            ? trashLibraryItem(item.id)
            : trashProject(item.id)
        )
      );

      setItems((previous) => [...lastAction.restore, ...previous]);
      setLastAction(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not undo that."
      );
    } finally {
      setIsBusy(false);
    }
  };

  const pendingItem = items.find((item) => item.id === pendingDeleteId) ?? null;

  return (
    <main className="relative flex min-h-screen bg-paper dark:bg-ink">
      {/* ================================================= */}
      {/* AMBIENT GLOWS                                     */}
      {/* ================================================= */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-44
          top-[-140px]
          h-96
          w-96
          rounded-full
          bg-amber/[0.04]
          blur-[120px]
        "
      />

      {/* ================================================= */}
      {/* SIDEBAR                                          */}
      {/* ================================================= */}

      <Sidebar active="trash" />

      {/* ================================================= */}
      {/* MAIN CONTENT                                      */}
      {/* ================================================= */}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar
          title="Trash"
          subtitle="Audio Studio / Trash"
          searchPlaceholder="Search trash..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="container-studio flex-1 py-8 sm:py-10">
          {/* Header */}
          <div
            className="
              flex
              flex-col
              gap-6
              lg:flex-row
              lg:items-end
              lg:justify-between
              lg:gap-8
            "
          >
            <div>
              <div
                className="
                  mb-3
                  flex
                  items-center
                  gap-2
                  font-mono
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-amber
                  sm:text-[10px]
                "
              >
                <span className="h-px w-5 bg-amber sm:w-6" />
                Recently deleted
              </div>

              <h1
                className="
                  font-display
                  text-[1.9rem]
                  font-semibold
                  leading-[1.05]
                  tracking-[-0.035em]
                  text-graphite
                  sm:text-4xl
                  lg:text-5xl
                  dark:text-mist
                "
              >
                Trash
              </h1>

              <p
                className="
                  mt-3
                  max-w-xl
                  text-[13px]
                  leading-6
                  text-graphite-muted
                  sm:text-sm
                  dark:text-mist-muted
                "
              >
                Deleted items are kept here temporarily before permanent removal.
              </p>
            </div>

            {/* Empty trash */}
            <button
              type="button"
              onClick={() => setIsEmptyingTrash(true)}
              disabled={items.length === 0}
              className="
                flex
                h-10
                shrink-0
                items-center
                gap-2
                rounded-full
                border
                border-coral/30
                bg-coral/5
                px-4
                text-xs
                font-semibold
                text-coral
                transition-all
                duration-200
                hover:bg-coral
                hover:text-ink
                disabled:cursor-not-allowed
                disabled:opacity-40
                disabled:hover:bg-coral/5
                disabled:hover:text-coral
              "
            >
              <X className="h-4 w-4" strokeWidth={2} />
              Empty Trash
            </button>
          </div>

          {/* ============================================= */}
          {/* UNDO BAR                                      */}
          {/* ============================================= */}

          {lastAction && (
            <div
              role="status"
              className="
                mt-6
                flex
                flex-wrap
                items-center
                gap-3
                rounded-xl
                border
                border-amber/30
                bg-amber/[0.06]
                px-4
                py-2.5
              "
            >
              <span className="text-[12px] text-graphite dark:text-mist">
                {lastAction.message}
              </span>

              <button
                type="button"
                onClick={undoLastAction}
                className="
                  ml-auto
                  flex
                  items-center
                  gap-1.5
                  text-[12px]
                  font-semibold
                  text-amber
                  transition-colors
                  hover:text-amber-strong
                "
              >
                <Undo2 className="h-3.5 w-3.5" strokeWidth={2} />
                Undo
              </button>
            </div>
          )}

          {/* ============================================= */}
          {/* AUTO-DELETE BANNER                            */}
          {/* ============================================= */}

          <div
            className="
              mt-4
              flex
              flex-wrap
              items-center
              gap-x-3
              gap-y-2
              rounded-xl
              border
              border-paper-border
              bg-paper-surface
              px-4
              py-3
              sm:px-5
              dark:border-ink-border
              dark:bg-ink-surface
            "
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-coral/20 bg-coral/10 text-coral">
              <Calendar className="h-3.5 w-3.5" strokeWidth={1.7} />
            </span>

            <p className="text-[12px] leading-5 text-graphite-muted dark:text-mist-muted">
              Items in Trash are automatically and permanently deleted after{" "}
              <span className="font-medium text-graphite dark:text-mist">
                30 days
              </span>
              .
            </p>

            <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-graphite-faint dark:text-mist-faint">
              {visibleItems.length} {visibleItems.length === 1 ? "item" : "items"}
            </span>
          </div>

          {/* ============================================= */}
          {/* TRASH LIST                                    */}
          {/* ============================================= */}

          {visibleItems.length === 0 ? (
            <div
              className="
                mt-4
                flex
                flex-col
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-dashed
                border-paper-border
                px-6
                py-16
                text-center
                dark:border-ink-border
              "
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber/20 bg-amber/10 text-amber">
                <Trash2 className="h-5 w-5" strokeWidth={1.6} />
              </span>

              <p className="text-sm font-medium text-graphite dark:text-mist">
                {items.length === 0 ? "Trash is empty" : "Nothing matches"}
              </p>

              <p className="max-w-sm text-[13px] leading-6 text-graphite-muted dark:text-mist-muted">
                {items.length === 0
                  ? "Deleted projects and assets will appear here for 30 days."
                  : `No deleted items match “${searchQuery.trim()}”.`}
              </p>
            </div>
          ) : (
            <section
              className="
                mt-4
                overflow-hidden
                rounded-xl
                border
                border-paper-border
                bg-paper-surface
                dark:border-ink-border
                dark:bg-ink-surface
              "
            >
              <div className="flex flex-col">
                {visibleItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={
                      index !== visibleItems.length - 1
                        ? "border-b border-paper-border dark:border-ink-border"
                        : ""
                    }
                  >
                    <TrashRow
                      item={item}
                      onRestore={() => restoreItem(item)}
                      onDelete={() => setPendingDeleteId(item.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ================================================= */}
      {/* CONFIRMATIONS                                     */}
      {/* ================================================= */}

      {pendingItem && (
        <ConfirmDialog
          title="Delete forever?"
          message={`“${pendingItem.name}” will be permanently removed. This can't be undone.`}
          confirmLabel="Delete forever"
          onConfirm={() => deleteItem(pendingItem)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {isEmptyingTrash && (
        <ConfirmDialog
          title="Empty the trash?"
          message={`All ${items.length} items will be permanently removed. This can't be undone.`}
          confirmLabel="Empty trash"
          onConfirm={emptyTrash}
          onCancel={() => setIsEmptyingTrash(false)}
        />
      )}
    </main>
  );
}