export function getBaseDate(dateStr) {
    if (dateStr) {
        // Aceita "YYYY-MM-DD" e "YYYY-MM-DD HH:mm"
        return new Date(dateStr);
    }
    return new Date();
}

export function formatTimestamp(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
