import React from 'react';

export const LoadingState = ({
    message = 'Loading...',
    detail = 'Please wait while the latest information is prepared.',
    fullPage = false
}) => (
    <div className={`page-loading-state${fullPage ? ' full-page-loading' : ''}`} aria-live="polite">
        <span className="admin-spinner" aria-hidden="true" />
        <strong>{message}</strong>
        <span>{detail}</span>
    </div>
);

export const TableLoadingRow = ({
    colSpan,
    message = 'Loading...',
    detail = 'Preparing the latest details.'
}) => (
    <tr>
        <td colSpan={colSpan} className="table-loading-cell" aria-live="polite">
            <span className="admin-spinner" aria-hidden="true" />
            <strong>{message}</strong>
            <span>{detail}</span>
        </td>
    </tr>
);

export default LoadingState;
