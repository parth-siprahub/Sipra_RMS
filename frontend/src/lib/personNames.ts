/**
 * Title-style name formatting for consistent display (matches backend format_person_name).
 */
function titleSingleWord(word: string): string {
    if (!word) return word;
    if (word.length === 1) return word.toUpperCase();
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

function titleToken(token: string): string {
    if (!token) return token;
    if (token.includes('-')) {
        return token.split('-').map(titleToken).join('-');
    }
    const parts = token.split("'");
    if (parts.length > 1) {
        return parts.map(titleSingleWord).join("'");
    }
    return titleSingleWord(token);
}

export function formatPersonName(value: string | null | undefined): string {
    if (value == null || value === '') return '';
    const collapsed = value.trim().split(/\s+/).join(' ');
    if (!collapsed) return '';
    return collapsed.split(' ').map(titleToken).join(' ');
}

/** First + last with consistent formatting and a single space. */
export function formatCandidateFullName(
    first: string | null | undefined,
    last: string | null | undefined,
): string {
    const a = formatPersonName(first ?? '');
    const b = formatPersonName(last ?? '');
    return [a, b].filter(Boolean).join(' ');
}
