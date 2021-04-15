import PeerId from 'peer-id';
import WebRTCStar from 'libp2p-webrtc-star'
import { NOISE } from 'libp2p-noise'
import Mplex from 'libp2p-mplex'
import Bootstrap from 'libp2p-bootstrap'
import React, { ReactNode, useContext, useEffect, useState } from 'react';
import Libp2p from 'libp2p';

const RENDEZVOUS_SERVER = '/dns4/ipfs.depa.digital/tcp/9091/wss/p2p-webrtc-star';

interface ILibP2PContext {
  p2p: Libp2p | null;
  peerId: PeerId | null
}
const LibP2PContext = React.createContext<ILibP2PContext>({
  p2p: null,
  peerId: null
});

const useLibP2P = () => useContext(LibP2PContext); 

const recoverOrCreatePeerId = async (): Promise<PeerId> => {
  const _peerId = localStorage.getItem("peerId");
  let peerId: PeerId; 
  if (_peerId) {
    peerId = await PeerId.createFromJSON(JSON.parse(_peerId));
  } else {
    peerId = await PeerId.create();
    localStorage.setItem("peerId", JSON.stringify(peerId.toJSON()));
  }
  return peerId;
}

const LibP2PProvider = ({ children }: {children: ReactNode}) => {
  
  const [p2p, setP2P] = useState<Libp2p | null>(null);
  const [peerId, setPeerId] = useState<PeerId | null>(null);

  useEffect(() => {
    console.debug("starting libp2p");
    
    (async () => {
      const _peerId = await recoverOrCreatePeerId();
      setPeerId(_peerId);
      const _libp2p = await Libp2p.create({
        peerId: _peerId,
        addresses: {
          listen: [
            RENDEZVOUS_SERVER
          ]
        },
        modules: {
          transport: [WebRTCStar],
          connEncryption: [NOISE],
          streamMuxer: [Mplex]
        },
        config: {
          
          peerDiscovery: {
            autoDial: false,
            [Bootstrap.tag]: {
              enabled: false
            }
          }
        }
      })
      await _libp2p.start()
      console.debug("libp2p started");
      setP2P(_libp2p);
    })();

    return () => {
      console.log("stopping");
     p2p?.stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <LibP2PContext.Provider value={{ p2p, peerId }}>
    {children}
  </LibP2PContext.Provider>
}

export {LibP2PProvider, useLibP2P, RENDEZVOUS_SERVER};