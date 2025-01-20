// useToastMessage.ts
import { useToasts } from "react-toast-notifications";
import { AppearanceTypes } from "react-toast-notifications";

export const useToastMessage = () => {
  const { addToast } = useToasts();

  const addToastMessage = (content: string, type: AppearanceTypes = "info") => {
    addToast(content, {
      appearance: type,
      autoDismiss: true,
      autoDismissTimeout: 3000,
    });
  };

  return { addToastMessage };
};
