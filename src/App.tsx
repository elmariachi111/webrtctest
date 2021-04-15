import { useEffect, useState } from 'react';
import { useLibP2P, RENDEZVOUS_SERVER } from './LibP2PContext';
import pipe from 'it-pipe';
import bs58 from 'bs58';
import PeerId from 'peer-id';

interface P2PMessage {
  signature: string;
  publicKey: string;
  content: string;
  peer?: string;
}
function App() {
  const {p2p, peerId} = useLibP2P();
  const [conn, setConn] = useState<any>();
  const textEncoder = new TextEncoder();

  const [received, setReceived] = useState<P2PMessage[]>([]);
  useEffect(() => {
    if (!p2p) return;
    console.log("new listeners")
    p2p.on('peer:discovery', (peerId) => {
      console.log("found peer", peerId.toB58String());
    })

    p2p.connectionManager.on('peer:connect', (connection) => {
      console.log(`Connected to ${connection.remotePeer.toB58String()}`)
    })

    p2p.connectionManager.on('peer:disconnect', (connection) => {
      console.log(`Disconnected from ${connection.remotePeer.toB58String()}`)
    })

    p2p.handle('/chat', async ({stream}) => {
      await pipe(
        stream.source,
        receive
      )
    });
    return () => {
      console.log("off listeners")
      p2p.removeAllListeners();
      p2p.connectionManager.removeAllListeners();
    }
  }, [p2p]);

  //todo: we need some handshake protocol here.
  const receive = async function (source: AsyncGenerator<any>) {
    for await (const msg of source) {
      const p2pMessage: P2PMessage = JSON.parse(msg.toString());
      
      const remotePeer = await PeerId.createFromPubKey(p2pMessage.publicKey!);
      const verified = await remotePeer.pubKey.verify(
        textEncoder.encode(p2pMessage.content), 
        bs58.decode(p2pMessage.signature)
      );
      console.log("message verified: ", verified);
      p2pMessage.peer = remotePeer.toB58String();
      setReceived(old => {
        return [
          ...old,
          p2pMessage,
        ]
      })
    }
  }
  
  const dial = async (peerId: string) => {
    console.log(peerId);
    const _conn = await p2p!.dial(`${RENDEZVOUS_SERVER}/p2p/${peerId}`)
    console.log(_conn);
    setConn(_conn)
  }

  const send = async (msg: string) => {
    const { stream } = await conn.newStream('/chat')
    const signed = await peerId!.privKey.sign(textEncoder.encode(msg));
    const signedEncoded = bs58.encode(signed);
    const payload: P2PMessage = {
      signature: signedEncoded,
      publicKey: peerId!.toJSON().pubKey!,
      content: msg
    };
    pipe(
      [JSON.stringify(payload)],
      stream.sink,
    ) 
  }

  return (
    <div>
      {p2p && <div>
        <h2>Peer Id: {p2p.peerId.toB58String()} </h2>

        <form onSubmit={(evt) => { evt.preventDefault(); dial(evt.currentTarget.remotePeer.value)} }>
          <label>Peer Id</label>
          <input type="text" name="remotePeer"></input>
        </form>

        {conn && <form onSubmit={(evt) => { evt.preventDefault(); send(evt.currentTarget.msg.value)} }>
          <label>Msg</label>
          <input type="text" name="msg"></input>
        </form>
        }
        <ul>
        {
          received.map( (msg, i) => (
            <li key={`msg-${i}`}>{msg.peer}: {msg.content}</li>
          ))
        }
        </ul>
      </div>}
    </div>
  );
}

export default App;
