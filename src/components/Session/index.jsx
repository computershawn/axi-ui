import { useContext, useState } from 'react';
import { store } from '../../providers/store';
import { ClearBtn, NavSection, SessionInfoCont, PanelSectionHeading, Divider, IconButton } from '../StyledUiCommon/styles';
import { PlugIcon, UserCircleIcon } from '../Icons';
import AxiDrawControl from '../AxiDrawControl';
import validateConnectionParams from '../../utils/axiConnectFormValidation';
import { plot, saveToLocalStorage } from '../../utils';

export default function Session({
  signOut,
  title,
}) {
  const [deviceName, setDeviceName] = useState('');
  const globalState = useContext(store);
  const {
    dispatch,
    state: {
      axiAddress,
      axiConnection,
      currentEntryIndex,
      entries,
      isConnected,
      user
    }} = globalState;

  const { host, port } = axiAddress;

  const registerConnection = (websocketConnection) => {
    dispatch({
      type: 'SET_CONNECTED',
      payload: {
        data: true,
      }
    });
    dispatch({
      type: 'SET_AXI_CONNECTION',
      payload: {
        data: websocketConnection,
      }
    });

    websocketConnection.send('get_name');
  };

  const registerError = (err, msg) => {
      // setConnectionError('Yikes! Please double-check the address and make sure the server is running.');
      dispatch({
        type: 'SET_CONNECTION_ERROR',
        payload: {
          data: msg
        },
      });
      console.warn("Websocket error:", err);
  }

  const getAxiSocket = () => {
    const co = new WebSocket(`ws://${host}:${port}/`);
    co.onmessage = function (event) {
      const message = JSON.parse(event.data);
      if (message.hasOwnProperty('deviceName')) {
        setDeviceName(message.deviceName);
      }
    };

    co.onopen = function (event) {
      // console.log(`Websocket is now open on ${co.url}!`);
      registerConnection(co);
      // console.log({ host, port });
      saveToLocalStorage('axidrawCreds', { host, port });
    };

    co.onerror = function (error) {
      registerError(error, 'Yikes! Please double-check the address and make sure the server is running.');
    };

    co.onclose = function (event) {
      console.log("WebSocket is now closed.");
      // window.sessionStorage.removeItem('axiConnection');
    };
  };

  const handleClickConnect = () => {
    const isValid = validateConnectionParams(axiAddress);
    if (isValid) {
      getAxiSocket();
    } else {
      registerError(new Error('The host or the port of this address is badly formatted.'), 'Address is badly formatted.')
    }
  };

  return (
    <>
      <NavSection>
        <PanelSectionHeading>{title}</PanelSectionHeading>
      </NavSection>
      <NavSection className="main-area">
        <div>
          <p className="info">Signed-in to Contentful</p>
          <SessionInfoCont>
            <UserCircleIcon width="2.5rem" height="2.5rem" fill='#4400A3' />
            <div className="specs">
              <p>{user.email}</p>
              <ClearBtn onClick={signOut}>sign out</ClearBtn>
            </div>
          </SessionInfoCont>
        </div>
        <Divider />
        <AxiDrawControl deviceName={deviceName} />
      </NavSection>
      {isConnected ? (
        <NavSection>
          <IconButton className="cta" variant="alternate" onClick={() => plot(entries[currentEntryIndex], axiConnection)} wide>
            <PlugIcon width="1.5rem" height="1.5rem" fill='#fff' />
            <span>Plot It!</span>
          </IconButton>
        </NavSection>
      ) : (
        <NavSection>
          <IconButton className="cta" variant="alternate" onClick={handleClickConnect} wide>
            <PlugIcon width="1.5rem" height="1.5rem" fill='#fff' />
            <span>Connect!</span>
          </IconButton>
        </NavSection>
      )}
    </>
  );
}
