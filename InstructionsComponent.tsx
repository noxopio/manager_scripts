import "./InstructionsComponent.css";
import { CONSTANTS } from "../common/Constants";
import { CardComponent } from "./CardComponent";
import { ValidateFaceComponent } from "./ValidateFaceComponent";
import backIcon from "../assets/img/backIcon.svg";
import foto from "../assets/img/photoIcon.svg";
import { useEffect, useState } from "react";
import MicrosoftTokenService from "../service/MicrosoftTokenService";
import { HabeasDataComponent } from "./HabeasDataComponent";
import TemplateGetService from "../service/TemplateGetService";
import TemplatePostService from "../service/TemplatePostService";
import ValidateHabeasDataService from "../service/HabeasDataService/ValidateHabeasDataService";
import GetHabeasDataService from "../service/HabeasDataService/GetHabeasDataService";
import { ModalAuthHabeasData } from "./ModalAuthHabeasData";
import {
  showModalCameraNotFound,
  showModalErrorService,
  showModalFaceValidationFailed,
  showModalFailedId,
  showModalNoAccessCamera,
  showModalNoHabeasData,
} from "../common/ModalFunctions";

export const InstructionsComponent = ({
  PubSubFunctions,
  ModalFunctions,
  env_variables,
  AxiosFunctions,
  UserFunctions,
  EncryptionFunction,
}) => {
  const [showComponent, setShowComponent] = useState(true);
  const [enableButton, setEnableButton] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [showHabeasData, setShowHabeasData] = useState(false);
  const [showModalHabeasData, setShowModalHabeasData] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [habeasData, setHabeasData] = useState([]);
  const keyPass = env_variables.KeyPassword;
  const IV = env_variables.IV;
  const Salt = env_variables.Salt;
  const API_URL_GENERATE_CUT = env_variables.API_URL_GENERATE_CUT;
  const API_URL_VALIDATE_CUT = env_variables.API_URL_VALIDATE_CUT;
  const API_URL_VALIDATE_STATE = env_variables.API_URL_VALIDATE_STATE;
  const API_URL_TAGGING = env_variables.API_URL_TAGGING;
  const API_URL_PARAMS = env_variables.API_URL_PARAMS;
  const API_URL_GENERATE_URL = env_variables.API_URL_GENERATE_URL;

  const initialServices = async () => {
    try {
      await MicrosoftTokenService.token(
        env_variables,
        AxiosFunctions,
        UserFunctions,
        EncryptionFunction
      );
      const responseGenerateCut = await TemplatePostService.postService(
        env_variables,
        AxiosFunctions,
        UserFunctions,
        API_URL_GENERATE_CUT,
        {}
      );
      if (responseGenerateCut.data.status.statusCode !== "201") {
        PubSubFunctions.publishLib("showLoader", false);
        showModalErrorService(ModalFunctions, PubSubFunctions);
        return;
      }
      const transaccionId = responseGenerateCut.data.data.transaccionId;

      const responseValidateCut = await TemplatePostService.postService(
        env_variables,
        AxiosFunctions,
        UserFunctions,
        API_URL_VALIDATE_CUT,
        { transaccionId: transaccionId }
      );
      if (responseValidateCut.data.status.statusCode !== "201") {
        PubSubFunctions.publishLib("showLoader", false);
        showModalErrorService(ModalFunctions, PubSubFunctions);
        return;
      }
      const infoUsuario = responseValidateCut.data.data.infoUsuario;
      const decryptInfo = EncryptionFunction.decryptValue(
        infoUsuario,
        keyPass,
        IV,
        Salt
      );
      const infoUser = JSON.parse(decryptInfo);
      const tipoIdentificacion = infoUser.tipoIdentificacion;
      const numeroIdentificacion = infoUser.numeroIdentificacion;
      UserFunctions.setUserInfo({
        typeDoc: tipoIdentificacion,
        numDoc: numeroIdentificacion,
      });
      const responseValidateHabeasData =
        await ValidateHabeasDataService.validateHabeasData(
          env_variables,
          AxiosFunctions,
          UserFunctions,
          tipoIdentificacion,
          numeroIdentificacion
        );
      const codigoHabeasData = responseValidateHabeasData?.data?.status?.codigo;
      const codeHabeasData = responseValidateHabeasData?.data?.code;
      switch (codigoHabeasData || codeHabeasData) {
        case "200":
          setEnableButton(true);
          setShowHabeasData(false);
          break;
        case "206":
          const responseGetHabeasData =
            await GetHabeasDataService.getHabeasData(
              env_variables,
              AxiosFunctions,
              UserFunctions
            );
          const data = responseGetHabeasData.data;
          const status = data.status.codigo;
          if (status !== "200") {
            PubSubFunctions.publishLib("showLoader", false);
            showModalErrorService(ModalFunctions, PubSubFunctions);
            return;
          }
          console.log(data.aceptos, "data");
          setHabeasData(data);
          setShowHabeasData(true);
          break;
        default:
          PubSubFunctions.publishLib("showLoader", false);
          // deviceError();
          showModalErrorService(ModalFunctions, PubSubFunctions);
          return;
      }
      try {
        const responseValidateState = await TemplateGetService.getService(
          env_variables,
          AxiosFunctions,
          API_URL_VALIDATE_STATE,
          UserFunctions
        );
        const responseTagging = await TemplateGetService.getService(
          env_variables,
          AxiosFunctions,
          API_URL_TAGGING,
          UserFunctions
        );
        const responseParams = await TemplateGetService.getService(
          env_variables,
          AxiosFunctions,
          API_URL_PARAMS,
          UserFunctions
        );
        const responseUrl = await TemplatePostService.postService(
          env_variables,
          AxiosFunctions,
          UserFunctions,
          API_URL_GENERATE_URL,
          {}
        );
        const statusCode =
          responseValidateState.data.status.statusCode ||
          responseTagging.data.status.statusCode ||
          responseParams.data.status.statusCode ||
          responseUrl.data.status.statusCode;
        switch (statusCode) {
          case 200:
          case 206:
          case "200":
          case "201":
            break;
          default:
            PubSubFunctions.publishLib("showLoader", false);
            showModalErrorService(ModalFunctions, PubSubFunctions);
            return;
        }
      } catch (error) {
        PubSubFunctions.publishLib("showLoader", false);
        showModalErrorService(ModalFunctions, PubSubFunctions);
      }
      PubSubFunctions.publishLib("showLoader", false);
    } catch (error) {
      PubSubFunctions.publishLib("showLoader", false);
      showModalErrorService(ModalFunctions, PubSubFunctions);
    }
  };

  useEffect(() => {
    PubSubFunctions.publishLib("showLoader", true);
    const timer = setTimeout(() => {
      initialServices();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (habeasData !== null) {
      console.log(habeasData, "showdata");
    }
  }, [habeasData]);
  console.log(" habeasSeteado", habeasData);

  const closeModal = () => {
    setShowModalHabeasData(false);
    setSelectedOption("");
  };
  const handleCheckboxChange = (value) => {
    setSelectedOption(value);
    switch (value) {
      case "yesHabeasData":
        setShowModalHabeasData(true);
        setEnableButton(true);
        setShowCheck(false);
        break;
      case "noHabeasData":
        showModalNoHabeasData(ModalFunctions, PubSubFunctions);
        setEnableButton(true);
        break;
      case "wantAuthorization":
        setShowModalHabeasData(true);
        setEnableButton(true);
        setShowCheck(true);
        break;
    }
  };

  const handleContinueModal = () => {
    setShowModalHabeasData(false);
  };

  const handleButtonClick = () => {
    setShowComponent(false);
  };

  const deviceError = () => {
    PubSubFunctions.publishLib("showLoader", false);
    // showModalNoAccessCamera(ModalFunctions, PubSubFunctions);//pendiente altura
    // showModalFaceValidationFailed(ModalFunctions, PubSubFunctions);
    // showModalCameraNotFound(ModalFunctions, PubSubFunctions);
    showModalFailedId(ModalFunctions, PubSubFunctions);
  };
  return (
    <>
      {showComponent ? (
        <div>
          <img src={backIcon} alt="Back Icon" className="only-mobile"></img>
          <div className="instructions-content-container">
            <h1 className="instructions-title">
              {CONSTANTS.CONTENT.INSTRUCTIONS_TITLE}
            </h1>
            <img className="icon-photo" src={foto} alt="Photo Icon"></img>
            <CardComponent />
            {showHabeasData && (
              <HabeasDataComponent
                selectedOption={selectedOption}
                handleCheckboxChange={handleCheckboxChange}
              />
            )}
            <>
              {showModalHabeasData && (
                <ModalAuthHabeasData
                  onClose={closeModal}
                  checkList={showCheck}
                  habeasData={habeasData}
                  showButton={true}
                  onClick={handleContinueModal}
                />
              )}
            </>
            <button
              className={
                enableButton
                  ? "instructions-button-continue"
                  : "instructions-button-continue-disabled"
              }
              onClick={handleButtonClick}
            >
              {CONSTANTS.BUTTONS.BUTTON_CONTINUE}
            </button>
            <a className="instructions-button-cancel">
              {CONSTANTS.BUTTONS.BUTTON_CANCEL}
            </a>
          </div>
        </div>
      ) : (
        <ValidateFaceComponent
          ModalFunctions={ModalFunctions}
          PubSubFunctions={PubSubFunctions}
        />
      )}
    </>
  );
};
