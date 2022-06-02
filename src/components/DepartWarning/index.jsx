import Image from 'next/image';
import { Button, ClearBtn } from '../StyledUiCommon/styles';
import { WarningModalContainer } from './styles';
import { ScreenShade } from '../StyledUiCommon/styles';

const DepartWarning = ({
  warningCopy={},
  dismiss=()=>{},
  leave=()=>{},
}) => {
  return (
    <ScreenShade>
      <WarningModalContainer>
        <div className="warning-modal-header">
          <h4>{warningCopy.title}</h4>
          <ClearBtn onClick={dismiss}>
            <Image alt="temp" src={"/icn-square.svg"} width={24} height={24} />
          </ClearBtn>
        </div>
        <div className="warning-modal-body">
          <p>{warningCopy.text}</p>
        </div>
        <div className="warning-modal-footer">
          <Button variant="secondary" onClick={dismiss}>CANCEL</Button>
          <Button onClick={leave}>YES</Button>
        </div>
      </WarningModalContainer>
    </ScreenShade>
  );
};

export default DepartWarning;
