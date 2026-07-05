export const extractErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';

  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
    }
    return String(detail);
  }

  if (error.message) return error.message;

  return String(error);
};
