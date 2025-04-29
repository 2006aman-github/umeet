export const gracefulCloseOfPeerConnection = async (peer) => {
  if (!peer) return;

  // Remove all event listeners
  peer.ontrack = null;
  peer.onremovetrack = null;
  peer.onicecandidate = null;
  peer.oniceconnectionstatechange = null;
  peer.onsignalingstatechange = null;

  // Close the connection
  peer?.close();

  peer = null;
};
