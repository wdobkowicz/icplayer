function AddonQuiz_create() {
    var presenter = function () {
    };

    var playerController;
    var eventBus; // Modules communication
    var state;

    var ERRORS = {
        'QUESTION_REQUIRED': "At least 1 question is required.",
        'EMPTY_QUESTION': "At least one question is not specified",
        'MISSING_CORRECT_ANSWER': "At least one question doesn't have specified correct answer",
        'MISSING_WRONG_ANSWER': "At least one question doesn't have specified wrong answer",
        'MISSING_HINT': "At least one question doesn't have specified hint",
    };

    function ConfigurationError(label) {
        return {
            name: 'ConfigurationError',
            message: ERRORS[label] || label
        }
    }

    presenter.activeElements = [];

    function setupDefaults() {
        state = {
            currentQuestion: 1,
            answersOrder: false,
            wasWrong: false,
            haveWon: false,
            fiftyFiftyUsed: false,
            hintUsed: null,
            isVisible: true
        };
        // addon's modes
        presenter.isErrorMode = false;
        presenter.isShowAnswersActive = false;
    }

    presenter.createAllOKEventData = function AddonQuiz_createAllOKEventData () {
        return {
            'source': presenter.addonID,
            'item': 'all',
            'value': '',
            'score': ''
        };
    };

    function validateQuestions(questions, helpButtons){
        if (questions.length<1){
            throw ConfigurationError('QUESTION_REQUIRED');
        }
        for (var i=0; i<questions.length; i++){
            var q = questions[i];
            if (ModelValidationUtils.isHtmlEmpty(q.Question)){
                throw ConfigurationError('EMPTY_QUESTION');
            }
            if (ModelValidationUtils.isStringEmpty(q.CorrectAnswer)){
                throw ConfigurationError('MISSING_CORRECT_ANSWER');
            }
            if (ModelValidationUtils.isStringEmpty(q.WrongAnswer1) ||
                ModelValidationUtils.isStringEmpty(q.WrongAnswer2) ||
                ModelValidationUtils.isStringEmpty(q.WrongAnswer3)
            ){
                throw ConfigurationError('MISSING_WRONG_ANSWER');
            }
            if (helpButtons && ModelValidationUtils.isHtmlEmpty(q.Hint)) {
                throw ConfigurationError('MISSING_HINT');
            }
        }
        return questions;
    }

    function getConfig(model) {
        var helpButtons = ModelValidationUtils.validateBoolean(model['ShowHelpButtons']);
        return {
            visibility: ModelValidationUtils.validateBoolean(model['Is Visible']),
            questions: validateQuestions(model['Questions'], helpButtons),
            helpButtons: helpButtons,
            nextLabel: model['NextLabel'] || '',
            gameLostMessage: model['GameLostMessage'],
            gameWonMessage: model['GameWonMessage'],
            isActivity: ModelValidationUtils.validateBoolean(model['isActivity']),
            isVisible: ModelValidationUtils.validateBoolean(model['Is Visible'])
        }
    };

    function shuffle(a) {
        var j, x, i;
        for (i = a.length; i; i--) {
            j = Math.floor(Math.random() * i);
            x = a[i - 1];
            a[i - 1] = a[j];
            a[j] = x;
        }
    };

    function cleanWorkspace() {
        unbindEvents();
        presenter.activeElements = [];
        var wrapper = presenter.$view.find('.question-wrapper');
        wrapper.children().remove();
    };

    function gameWonMessage() {
        var wrapper = $('<div class="game-won-message-wrapper"></div>');
        var message = $('<div class="game-won-message"></div>');
        message.html(presenter.config.gameWonMessage);
        wrapper.append(message);
        presenter.$view.find('.question-hint').append(wrapper);
    };

    function gameLostMessage() {
        var wrapper = $('<div class="game-lost-message-wrapper"></div>');
        var message = $('<div class="game-lost-message"></div>');
        message.html(presenter.config.gameLostMessage);
        wrapper.append(message);
        presenter.$view.find('.question-hint').append(wrapper);
    };

    function getSelectItemAction(isCorrect, $this) {
        return function selectItemAction(e) {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            var eventData = {
                'source': presenter.addonID,
                'item': state.currentQuestion,
                'value': '1',
                'score': '1'
            };
            if(isCorrect) {
                $this.addClass('correct');
                state.haveWon = true;
                eventBus.sendEvent('ValueChanged', eventData);
                if (state.currentQuestion == presenter.config.questions.length){
                    gameWonMessage();
                    eventBus.sendEvent('ValueChanged', presenter.createAllOKEventData())
                } else {
                   presenter.nextButton.addClass('active');
                }
            } else {
                $this.addClass('wrong');
                eventData['score'] = '0';
                eventBus.sendEvent('ValueChanged', eventData);
                gameLostMessage();
                state.wasWrong = true;
            }
        }
    };

    function bindEvents() {
        for (var i=0; i<presenter.activeElements.length; i++) {
            var $el = presenter.activeElements[i];
            $el.bind('click', $el.clickAction);
        }
    };

    function unbindEvents() {
        for (var i=0; i<presenter.activeElements.length; i++) {
            var $el = presenter.activeElements[i];
            $el.unbind('click', $el.clickAction);
        }
    };

    function getCurrentQuestion(){
        return presenter.config.questions[state.currentQuestion-1];
    }

    function fiftyFiftyAction(e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (!state.fiftyFiftyUsed) {
            // clue:
            state.fiftyFiftyUsed = true;
            unbindEvents();
            var removedItems = 0,
                i = -1;
            while (removedItems < 2) {
                i++;
                if (i == state.answersOrder.length){
                    i = 0;
                }
                var item = state.answersOrder[i];
                if (item===0 || item == null){
                    continue;
                }
                var x = Math.round(Math.random());
                if (x) {
                    removedItems++;
                    state.answersOrder[i] = null;
                }
            }
            showCurrentQuestion();
            bindEvents();
        }
    };

    function showHint(){
        presenter.$view.find('.question-hint').html(getCurrentQuestion().Hint);
        presenter.$view.find('.hint-button').addClass('used');
    }

    function nextButtonAction(e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (state.haveWon && state.currentQuestion < presenter.config.questions.length) {
            state.haveWon = false;
            state.answersOrder = false;
            state.currentQuestion++;
            showCurrentQuestion();
            bindEvents();
        }
    }

    function hintAction(e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (state.hintUsed === null) {
            state.hintUsed = state.currentQuestion;
            showHint();
        }
    };

    function showQuestion(q, showAnswer) {
        var $q = presenter.$view.find('.question-wrapper');
        var $title = $('<div class="question-title"></div>');
        var $tips = $('<div class="question-tips"></div>');

        cleanWorkspace();

        $title.html(q.Question);

        var tempAnswers = [
            q.CorrectAnswer,
            q.WrongAnswer1,
            q.WrongAnswer2,
            q.WrongAnswer3,
        ];

        if (!state.answersOrder){
            state.answersOrder = [0, 1, 2, 3];
            shuffle(state.answersOrder);
        }

        var answers = [0, 1, 2, 3];
        for (var i=0; i<4; i++){
            var index = state.answersOrder[i];
            if (index === null){
                answers[i] = null;
            } else {
                answers[i] = tempAnswers[index];
            }
        }

        var labels = ['A: ', 'B: ', 'C: ', 'D: '];

        for (var i=0; i<answers.length; i++) {
            var $tip = $('<div class="question-tip"></div>');
            var answer = answers[i];
            var label = labels[i];
            $tip.text(label + (answer || ''));
            if (answer === null){
                $tip.addClass('removed');
                $tip.clickAction = function () {};
            } else {
                $tip.clickAction = getSelectItemAction(answer==q.CorrectAnswer, $tip);
            }

            if (showAnswer && answer==q.CorrectAnswer) {
                $tip.addClass('correct-answer');
            }
            $tips.append($tip);
            presenter.activeElements.push($tip);
        }

        $q.append($title);
        $q.append($tips);
        var $buttons = $('<div class="question-hint-buttons"></div>');
        $q.append($buttons);
        if (presenter.config.helpButtons){
            var $hint = $('<div class="question-hint"></div>');
            var $fiftyFifty = $('<div class="fifty-fifty"></div>');
            var $hintButton = $('<div class="hint-button"></div>');
            $fiftyFifty.clickAction = fiftyFiftyAction;
            $hintButton.clickAction = hintAction;
            $buttons.append($fiftyFifty);
            $buttons.append($hintButton);
            presenter.activeElements.push($fiftyFifty);
            presenter.activeElements.push($hintButton);
            $q.append($hint);
            $q.addClass('with-hint');
            if (state.fiftyFiftyUsed) {
                $fiftyFifty.addClass('used');
            }
            if (state.hintUsed) {
                $hintButton.addClass('used');
                if (state.hintUsed == state.currentQuestion){
                    showHint();
                }
            }
        } else {
            $q.addClass('without-hint');
        }
        var $nextButton = $('<div class="next-question-button"></div>');
        $nextButton.text(presenter.config.nextLabel);
        $nextButton.clickAction = nextButtonAction;
        presenter.activeElements.push($nextButton);
        presenter.nextButton = $nextButton;
        $buttons.append($nextButton);
    };

    function initializeLogic(view, model, preview) {
        setupDefaults();
        presenter.$view = $(view);
        try {
            presenter.config = getConfig(model);
            showCurrentQuestion();
        } catch (error){
            var $error = $('<div class="quiz-error-layer"></div>');
            var text = "<strong>" + error.name + "</strong>: " + error.message;
            $error.html(text);
            presenter.$view.find('.question-wrapper').append($error);
            presenter.config = {};
        }

        if (!preview){
            bindEvents();
        }
    };

    function showCurrentQuestion() {
        showQuestion(getCurrentQuestion(), false);
    }

    presenter.setPlayerController = function AddonQuiz_setPlayerController(controller) {
        playerController = controller;
    };

    presenter.setVisibility = function AddonQuiz_setVisibility(isVisible) {
        state.isVisible = isVisible;
        presenter.$view.css('visibility', isVisible ? 'visible' : 'hidden');
    };

    presenter.hide = function AddonQuiz_hide() {
        presenter.setVisibility(false);
    };

    presenter.show = function AddonQuiz_show() {
        presenter.setVisibility(true);
    };

    presenter.run = function AddonQuiz_run(view, model) {
        eventBus = playerController.getEventBus();
        presenter.addonID = model.ID;
        initializeLogic(view, model, false);
        presenter.setVisibility(presenter.config.isVisible);

        eventBus.addEventListener('ShowAnswers', this);
        eventBus.addEventListener('HideAnswers', this);
    };

    presenter.createPreview = function AddonQuiz_createPreview(view, model) {
        initializeLogic(view, model, true);
    };

    presenter.getState = function AddonQuiz_getState() {
        if ("{}" === JSON.stringify(presenter.config)){
            return "";
        }
        return JSON.stringify(state);
    };

    presenter.setState = function AddonQuiz_setState(gotState) {
        if (!gotState) {
            return;
        }
        state = JSON.parse(gotState);
        cleanWorkspace();
        if (state.wasWrong){
            gameLostMessage();
        } else if (state.haveWon){
            gameWonMessage();
        } else {
            showCurrentQuestion();
            bindEvents();
        }
        presenter.setVisibility(state.isVisible);
    };

    presenter.setShowErrorsMode = function AddonQuiz_setShowErrorsMode() {
        if (!presenter.config.isActivity || presenter.isErrorMode) {
            return;
        }

        presenter.isErrorMode = true;

        if (presenter.isShowAnswersActive) {
            presenter.hideAnswers();
        }

        showErrorsMode();
    };

    presenter.setWorkMode = function AddonQuiz_setWorkMode() {
        if (!presenter.config.isActivity || !presenter.isErrorMode) {
            return;
        }

        presenter.isErrorMode = false;

        if (presenter.isShowAnswersActive) {
            presenter.hideAnswers();
        }

        workMode();
    };

    function showErrorsMode(){
        presenter.disable();
    };

    function workMode(){
        presenter.enable();
    };

    presenter.reset = function AddonQuiz_reset() {
        presenter.setWorkMode();
        setupDefaults();
        showCurrentQuestion();
        bindEvents();
        presenter.setVisibility(presenter.config.isVisible);
    };

    presenter.getErrorCount = function AddonQuiz_getErrorCount() {
        if (!presenter.config.isActivity) return 0;
        return getErrorCount();
    };

    presenter.getMaxScore = function AddonQuiz_getMaxScore() {
        if (!presenter.config.isActivity) return 0;
        return getMaxScore();
    };

    presenter.getScore = function AddonQuiz_getScore() {
        if (!presenter.config.isActivity) return 0;
        return getScore();
    };

    function getErrorCount() {
        return state.wasWrong ? 1 : 0;
    }

    function getMaxScore() {
        return presenter.config.questions.length;
    }

    function getScore() {
        if (state.haveWon) {
            return state.currentQuestion;
        } else {
            return state.currentQuestion - 1;
        }
    }

    presenter.executeCommand = function AddonQuiz_executeCommand(name, params) {
        if (presenter.isErrorMode) {
            return;
        }

        var commands = {
            'isAllOK': presenter.isAllOK,
            'isAttempted' : presenter.isAttempted,
            'show': presenter.show,
            'hide': presenter.hide,
            'disable': presenter.disable,
            'enable': presenter.enable,
            'reset' : presenter.reset
        };

        Commands.dispatch(commands, name, params, presenter);
    };

    presenter.isAllOK = function AddonQuiz_isAllOK() {
        return presenter.getMaxScore() === presenter.getScore() && presenter.getErrorCount() === 0;
    };

    presenter.isAttempted = function AddonQuiz_isAttempted() {
        return (state.currentQuestion > 1) || state.wasWrong || state.haveWon;
    };

    presenter.disable = function AddonQuiz_disable() {
        presenter.$view.find('.question-wrapper').addClass('disabled');
        unbindEvents();
    };

    presenter.enable = function AddonQuiz_enable() {
        presenter.$view.find('.question-wrapper').removeClass('disabled');
        bindEvents();
    };

    presenter.onEventReceived = function AddonQuiz_onEventReceived(eventName) {
        if (eventName == "ShowAnswers") {
            presenter.showAnswers();
        }

        if (eventName == "HideAnswers") {
            presenter.hideAnswers();
        }
    };

    presenter.showAnswers = function AddonQuiz_showAnswers() {
        if (!presenter.config.isActivity) {
            return;
        }
        presenter.isShowAnswersActive = true;
        showAnswers();
    };

    presenter.hideAnswers = function AddonQuiz_hideAnswers() {
        if (!presenter.config.isActivity) {
            return;
        }
        presenter.isShowAnswersActive = false;
        hideAnswers();
    };

    function showAnswers() {
        showQuestion(getCurrentQuestion(), true);
    }

    function hideAnswers() {
        cleanWorkspace();
        if (state.wasWrong){
            gameLostMessage();
        } else if (state.haveWon){
            gameWonMessage();
        } else {
            showCurrentQuestion();
            bindEvents();
        }
    }

    return presenter;
}