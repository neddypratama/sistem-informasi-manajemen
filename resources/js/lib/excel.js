import { client } from '../api/client';

function filenameFromDisposition(header, fallback) {
    const match = header?.match(/filename="([^"]+)"/);
    return match ? match[1] : fallback;
}

export async function exportExcel(url, params, fallbackFilename) {
    const response = await client.get(url, {
        params,
        responseType: 'blob',
    });

    const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filenameFromDisposition(response.headers['content-disposition'], fallbackFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
}