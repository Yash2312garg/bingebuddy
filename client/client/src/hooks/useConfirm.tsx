import  { useCallback, useState } from "react";
import { ConfirmActionPopup } from "../Components/ConfirmActionPopup";
import Btn from "../Components/Buttons/Button";
interface ConfirmOptions {
  heading: string;
  content: string;
  confirmLabel?: string;
  cancelLabel?: string;
}


interface ConfirmState extends ConfirmOptions{
    visible: boolean,
    resolve: ((val:boolean)=>void)|null
}

export const useConfirm =()=>{

    const [state,setState] = useState<ConfirmState>({
        visible: false,
        heading: "",
        content: "",
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        resolve: null
    })
    
    const confirm = useCallback((options:ConfirmOptions):Promise<boolean>=>{
        return new Promise((resolve)=>{
            setState({
                ...options,
                visible: true,
                resolve,
            })
        })
    },[])

    const handleConfirm = useCallback(()=>{
        state.resolve?.(true)
        setState((prev)=>({...prev, visible: false, resolve: null}))
    },[state])
    
    const handleCancel = useCallback(()=>{
        state.resolve?.(false)
        setState((prev)=>({...prev, visible: false, resolve: null}))
    },[state])
  
    const ConfirmDialog = useCallback(() => (
        <ConfirmActionPopup open={state.visible}>
          <ConfirmActionPopup.Heading>
            {state.heading}
          </ConfirmActionPopup.Heading>

          <ConfirmActionPopup.Content>
            {state.content}
          </ConfirmActionPopup.Content>

          <ConfirmActionPopup.Actions>
            <Btn variant="Secondary" onClick={handleCancel}>
              {state.cancelLabel ?? "Cancel"}
            </Btn>

            <Btn variant="Primary" onClick={handleConfirm}>
              {state.confirmLabel ?? "Confirm"}
            </Btn>
          </ConfirmActionPopup.Actions>
        </ConfirmActionPopup>
      ), [state, handleConfirm, handleCancel]);

  return { confirm, ConfirmDialog };

}