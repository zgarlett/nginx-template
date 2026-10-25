import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import './Table.css';
import { useDelete } from '../../hooks/Api';
import { backendApiBaseUrl } from '../../constants';
interface Props {
    data: Record<string, string>[];
    headers: string[];
}

const Table: React.FC<Props> = ({ data, headers }) => {
    const { error, loading, del } = useDelete<{ deletedRows: number; filenames: string[] }>(
        `${backendApiBaseUrl}statements/files`,
    );
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());
    const [isHoldingDelete, setIsHoldingDelete] = useState(false);
    const [selectionError, setSelectionError] = useState('');
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const visibleRows = data
        .map((row, index) => ({ row, index }))
        .filter(({ index }) => !deletedRows.has(index));
    const allRowsSelected = visibleRows.length > 0
        && visibleRows.every(({ index }) => selectedRows.has(index));

    const toggleRow = (rowIndex: number) => {
        if (isHoldingDelete || loading) return;
        setSelectedRows((current) => {
            const next = new Set(current);
            if (next.has(rowIndex)) next.delete(rowIndex);
            else next.add(rowIndex);
            return next;
        });
    };

    const toggleAllRows = () => {
        if (isHoldingDelete || loading) return;
        setSelectedRows((current) => {
            const next = new Set(current);
            for (const { index } of visibleRows) {
                if (allRowsSelected) next.delete(index);
                else next.add(index);
            }
            return next;
        });
    };

    const deleteSelectedRows = async () => {
        const selected = visibleRows.filter(({ index }) => selectedRows.has(index));
        const filenames = selected
            .map(({ row }) => row.filename ?? row.Filename)
            .filter((filename): filename is string => typeof filename === 'string' && filename.trim().length > 0);
        if (filenames.length !== selected.length) {
            setSelectionError('Could not delete selection: one or more rows have no filename.');
            return;
        }
        setSelectionError('');

        try {
            await del({ filenames });
            setDeletedRows((current) => new Set([...current, ...selected.map(({ index }) => index)]));
            setSelectedRows(new Set());
        } catch {
            // The request hook exposes the failure for rendering below.
        }
    };

    const cancelDeleteHold = () => {
        if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }
        setIsHoldingDelete(false);
    };

    const startDeleteHold = () => {
        if (selectedRows.size === 0 || loading || holdTimer.current) return;
        setSelectionError('');
        setIsHoldingDelete(true);
        holdTimer.current = setTimeout(() => {
            holdTimer.current = null;
            setIsHoldingDelete(false);
            void deleteSelectedRows();
        }, 5000);
    };

    const handleDeleteKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
            event.preventDefault();
            startDeleteHold();
        }
    };

    const handleDeletePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button === 0) startDeleteHold();
    };

    useEffect(() => () => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
    }, []);

    return (
        <div className="table-workspace">
            <main className="table-main">
                <div className="table-content">
                    <section className="table-preview" aria-labelledby="preview-title">
                        <div className="table-section-heading">
                            <div><h2 id="preview-title">Files Ingested</h2></div>
                            <span className="table-row-count">
                                {selectedRows.size.toLocaleString()} OF {visibleRows.length.toLocaleString()} SELECTED
                            </span>
                        </div>
                        {visibleRows.length > 0 ? (
                            <>
                                <div className="table-selection-actions">
                                    <p>Click a row to select or deselect it.</p>
                                    <button type="button" onClick={toggleAllRows} disabled={isHoldingDelete || loading}>
                                        {allRowsSelected ? 'Clear selection' : 'Select all'}
                                    </button>
                                </div>
                            <div className="table-table-scroll">
                                <table className="table-table">
                                    <thead>
                                        <tr>
                                            <th scope="col"><span className="table-sr-only">Select row</span></th>
                                            {headers.map((header) => <th scope="col" key={header}>{header}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>{visibleRows.map(({ row, index: rowIndex }) => {
                                        const isSelected = selectedRows.has(rowIndex);
                                        return (
                                            <tr
                                                key={rowIndex}
                                                className={`${isSelected ? 'is-selected' : ''}${isHoldingDelete ? ' is-selection-locked' : ''}`}
                                                aria-selected={isSelected}
                                                tabIndex={isHoldingDelete || loading ? -1 : 0}
                                                onClick={() => toggleRow(rowIndex)}
                                                onKeyDown={(event) => {
                                                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                                                        event.preventDefault();
                                                        toggleRow(rowIndex);
                                                    }
                                                }}
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        aria-label={`Select row ${rowIndex + 1}`}
                                                        disabled={isHoldingDelete || loading}
                                                        onClick={(event) => event.stopPropagation()}
                                                        onChange={() => toggleRow(rowIndex)}
                                                    />
                                                </td>
                                                {headers.map((header) => (
                                                    <td key={header}>
                                                        {row[header] ?? row[header.toLowerCase()] ?? <span className="table-empty-cell">—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}</tbody>
                                </table>
                            </div>
                            <div className="table-footer-actions">
                                <button
                                    type="button"
                                    className={`table-delete-button${isHoldingDelete ? ' is-holding' : ''}`}
                                    disabled={selectedRows.size === 0 || loading}
                                    onPointerDown={handleDeletePointerDown}
                                    onPointerUp={cancelDeleteHold}
                                    onPointerLeave={cancelDeleteHold}
                                    onPointerCancel={cancelDeleteHold}
                                    onKeyDown={handleDeleteKeyDown}
                                    onKeyUp={cancelDeleteHold}
                                    onBlur={cancelDeleteHold}
                                    aria-label={isHoldingDelete ? 'Keep holding to delete selected files' : 'Hold for 5 seconds to delete selected files'}
                                    aria-describedby="table-delete-instructions"
                                >
                                    <span>{loading ? 'Deleting…' : isHoldingDelete ? 'Keep holding…' : 'Hold 5 seconds to delete'}</span>
                                </button>
                            </div>
                            <p className="table-delete-instructions" id="table-delete-instructions" aria-live="polite">
                                {isHoldingDelete ? 'Keep holding; releasing early cancels deletion.' : 'Press and hold to confirm deletion.'}
                            </p>
                            {(error || selectionError) && <p className="table-feedback is-error" role="alert">{selectionError || error?.message}</p>}
                            </>
                        ) : (
                            <div className="table-preview-empty"><span aria-hidden="true">↳</span><p>Your file preview will appear here.</p></div>
                        )}
                    </section>
                </div>
            </main> 
        </div>
    );
};

export default Table;