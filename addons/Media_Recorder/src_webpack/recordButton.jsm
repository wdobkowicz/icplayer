export class RecordButton {

    constructor($button, state, timer, recorder, recordTimerLimiter) {
        this.$button = $button;
        this.state = state;
        this.timer = timer;
        this.recorder = recorder;
        this.recordTimerLimiter = recordTimerLimiter;
    }

    activate() {
        this.$button.click(event => this.eventHandler(event));
    }

    deactivate() {
        this.$button.unbind();
    }

    forceClick() {
        this.$button.click();
    }

    eventHandler(event) {
        if (this.state.isNew() || this.state.isLoaded())
            this.onStartRecording(event);
        else if (this.state.isRecording())
            this.onStopRecording(event)
    }

    onStartRecording(event) {
        $(event.target).addClass("selected");
        this.state.setRecording();
        this.timer.startRecording();
        this.recorder.record();
        this.recordTimerLimiter.startCountdown();
    }

    onStopRecording(event) {
        $(event.target).removeClass("selected");
        this.state.setLoaded();
        this.timer.stopRecording();
        this.recorder.stopRecording();
        this.recordTimerLimiter.stopCountdown();
    }
}