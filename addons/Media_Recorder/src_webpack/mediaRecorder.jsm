import {PlayButton} from "./playButton.jsm";
import {RecordButton} from "./recordButton.jsm";
import {Timer} from "./timer.jsm";
import {RecorderFactory} from "./recorder/recorderFactory.jsm";
import {PlayerFactory} from "./player/playerFactory.jsm";
import {RecordTimeLimiter} from "./recordTimeLimiter.jsm";
import {validateModel} from "./validator.jsm";
import {DefaultRecordingLoader} from "./defaultRecordingLoader.jsm";
import {SoundIntensity} from "./soundIntensity.jsm";
import {SoundEffect} from "./soundEffect.jsm";
import {RecordButtonSoundEffect} from "./recordButtonSoundEffect.jsm";
import {AssetService} from "./assetService.jsm";
import {RecordingState} from "./recordingState.jsm";
import {State} from "./state.jsm";

export class MediaRecorder {
    constructor() {
    }

    DEFAULT_VALUES = {
        MAX_TIME: 60,
        SUPPORTED_TYPES: ['audio', 'video']
    };

    ERROR_CODES = {
        "maxTime_INT02": "Time value contains non numerical characters",
        "maxTime_INT04": "Time in seconds cannot be negative value",
        "type_EV01": "Selected type is not supported"
    };

    run(view, model) {
        this.view = view;
        this.model = model;

        this.initialize();

        this.playButton.activate();
        this.recordButton.activate();
    }

    createPreview(view, model) {
        this.view = view;
        this.model = model;

        this.initialize();
    }

    initialize() {
        this.validateModel = validateModel;
        let validatedModel = this.validateModel(this.model, this.DEFAULT_VALUES);

        if (!validatedModel.isValid) {
            DOMOperationsUtils.showErrorMessage(this.view, this.ERROR_CODES, this.validateModel.fieldName.join("|") + "_" + this.validateModel.errorCode);
            return;
        }

        this.configuration = validatedModel.value;
        this.state = new State();
        this.recordingState = new RecordingState();

        let $playerView = $(this.view).find(".media-recorder-player-wrapper");
        let $timerView = $(this.view).find(".media-recorder-timer");
        let $soundIntensityView = $(this.view).find(".media-recorder-sound-intensity");
        let $recordButtonView = $(this.view).find(".media-recorder-recording-button");
        let $playButtonView = $(this.view).find(".media-recorder-play-button");

        this.timer = new Timer($timerView);
        this.soundIntensity = new SoundIntensity($soundIntensityView);

        this.playerFactory = new PlayerFactory($playerView, this.timer, this.soundIntensity, this.ERROR_CODES.type_EV01);
        this.player = this.playerFactory.createPlayer(this.configuration.type);

        this.recorderFactory = new RecorderFactory(this.ERROR_CODES.type_EV01);
        this.recorder = this.recorderFactory.createRecorder(this.configuration.type);

        this.assetService = new AssetService(this.playerController, this.state);
        this.recordTimeLimiter = new RecordTimeLimiter(this.configuration.maxTime);

        this.playButton = new PlayButton($playButtonView, this.recordingState, this.timer, this.player, this.soundIntensity);
        this.recordButton = new RecordButton($recordButtonView, this.recordingState, this.timer, this.recorder, this.recordTimeLimiter);

        this.startRecordingSoundEffect = new SoundEffect(this.configuration.startRecordingSound, $playerView);
        this.stopRecordingSoundEffect = new SoundEffect(this.configuration.stopRecordingSound, $playerView);
        this.recordButton = new RecordButtonSoundEffect(this.recordButton, this.startRecordingSoundEffect, this.stopRecordingSoundEffect);

        this.player.onEndedPlaying = () => this.playButton.forceClick();
        this.recordTimeLimiter.onTimeExpired = () => this.recordButton.forceClick();

        this.recorder.onAvailableResources = stream => {
            this.player.stream = stream;
            this.soundIntensity.openStream(stream);
        };

        this.recorder.onAvailableRecording = blob => {
            let recording = URL.createObjectURL(blob);
            this.player.stop();
            this.player.recording = recording;
            this.assetService.storeAsset(blob);
        };

        this.player.onStartPlaying = mediaNode => {
            let stream = mediaNode.captureStream();
            this.soundIntensity.openStream(stream);
        };

        this.player.onStopPlaying = () => {
            this.soundIntensity.closeStream();
        };

        this.player.onDurationChanged = duration => {
            this.timer.duration = duration;
        };

        this.defaultRecordingLoader = new DefaultRecordingLoader(this.player, this.timer, this.recordingState);
        this.defaultRecordingLoader.loadDefaultRecording(this.configuration.defaultRecording);
    }

    setPlayerController(playerController) {
        this.playerController = playerController;
    }

    getState() {
        return this.state.serialize();
    }

    setState(state) {
        this.state.deserialize(state);
        if (this.state.mediaSource) {
            this.recordingState.setLoaded();
            this.player.recording = this.state.mediaSource;
        }
    }
}