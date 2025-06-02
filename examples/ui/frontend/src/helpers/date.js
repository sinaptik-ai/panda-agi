export const formatTimestamp = (timestamp) => {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - eventTime) / 1000);

  if (diffInSeconds < 60) {
    return diffInSeconds <= 1 ? "just now" : `${diffInSeconds}s ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? "1 min ago" : `${diffInMinutes} mins ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }

  // For older events, fall back to date format
  return eventTime.toLocaleDateString();
};
