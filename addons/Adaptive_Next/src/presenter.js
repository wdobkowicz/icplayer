function AddonAdaptive_Next_create() {
    var presenter = function() {};

    presenter.isAdaptivePreviewMode = false;

    presenter.CONSTANTS = {
        NEXT_IMAGE: 'baseline-navigate_next-24px.svg',
        PREV_IMAGE: 'baseline-navigate_before-24px.svg'
    };

    presenter.BUTTON_TYPE = {
        NEXT: 'Next',
        PREV: 'Previous'
    };

    presenter.state = {
        isVisible: true,
        isDisabled: false,
        isErrorMode: false
    };

    presenter.executeUserEventCode = function() {
        if (presenter.playerController == null) return;
        if (presenter.configuration.onClickEvent.isEmpty) return;

        presenter.playerController.getCommands().executeEventCode(presenter.configuration.onClickEvent.value);
    };

    presenter.clickHandler = function (event) {
        if (event !== undefined) {
            event.stopPropagation();
        }

        if (presenter.state.isDisabled) return;
        if (presenter.state.isErrorMode) return;

        presenter.triggerButtonClickedEvent();
    };

    function handleMouseActions() {
        var $element = presenter.$view.find('div[class*=adaptive-next-button-element]');
        $element.click(presenter.clickHandler);
    }

    function setElementsDimensions(model, wrapper, element) {
        var viewDimensions = DOMOperationsUtils.getOuterDimensions(presenter.$view);
        var viewDistances = DOMOperationsUtils.calculateOuterDistances(viewDimensions);
        presenter.$view.css({
            width:(model.Width - viewDistances.horizontal) + 'px',
            height:(model.Height - viewDistances.vertical) + 'px'
        });

        DOMOperationsUtils.setReducedSize(presenter.$view, wrapper);
        DOMOperationsUtils.setReducedSize(wrapper, element);
    }

    function addImageBackground(element) {
        var resource = presenter.getResourceName();
        var source = getImageUrlFromResources(resource);

        if (presenter.configuration.Image) {
            source = presenter.configuration.Image;
        }

        element.css('background-image', 'url(' + source + ')');
    }

    presenter.getResourceName = function () {
        if (presenter.configuration.Direction === presenter.BUTTON_TYPE.NEXT) {
            return presenter.CONSTANTS.NEXT_IMAGE
        } else {
            return presenter.CONSTANTS.PREV_IMAGE;
        }
    };

    presenter.createElement = function($element) {
        if (presenter.configuration.isTabindexEnabled) {$element.attr('tabindex', '0');}

        addImageBackground($element);
    };

    presenter.initView = function () {
        var $wrapper = $(presenter.$view.find('.adaptive-next-wrapper')[0]);
        var $element = presenter.$view.find('.adaptive-next-button-element');

        presenter.createElement($element);

        setElementsDimensions(presenter.configuration, $wrapper, $element);
        presenter.toggleDisable(presenter.configuration.isDisabled);
        presenter.setVisibility(presenter.configuration.isVisible || isPreview);
    };

    function presenterLogic(view, model, isPreview) {
        presenter.addonID = model.ID;
        presenter.$view = $(view);

        var validatedModel = presenter.validateModel(model);

        if (!validatedModel.isValid) {
            return;
        }

        presenter.configuration = validatedModel.value;


        presenter.initView();

        if (!isPreview) {
            handleMouseActions();
        }
    }

    presenter.setPlayerController = function(controller) {
        presenter.playerController = controller;
        presenter.adaptiveLearningService = presenter.playerController.getAdaptiveLearningService();

        var eventBus = presenter.playerController.getEventBus();

        eventBus.addEventListener('ShowAnswers', this);
        eventBus.addEventListener('HideAnswers', this);
    };

    presenter.createPreview = function(view, model) {
        presenterLogic(view, model, true);
    };

    presenter.run = function(view, model){
        presenterLogic(view, model, false);
    };


    presenter.validateString = function (imageSrc) {
        var isEmpty = ModelValidationUtils.isStringEmpty(imageSrc);

        return {
            isEmpty: isEmpty,
            value: isEmpty ? "" : imageSrc
        };
    };

    presenter.validateModel = function (model) {
        var modelValidator = new ModelValidator();

        var validatedModel = modelValidator.validate(model, [
            ModelValidators.utils.FieldRename("Is Visible", "isVisible", ModelValidators.Boolean('isVisible')),
            ModelValidators.Enum('Direction', {
                default: presenter.BUTTON_TYPE.NEXT,
                values: [presenter.BUTTON_TYPE.NEXT, presenter.BUTTON_TYPE.PREV]
            }),
            ModelValidators.utils.FieldRename("Is disabled", "isDisabled", ModelValidators.Boolean('isDisabled')),
            ModelValidators.Integer('Width'),
            ModelValidators.Integer('Height'),
            ModelValidators.DumbString('ID'),
            ModelValidators.String('Image', {'default': null})
        ]);

        return validatedModel;
    };

    presenter.executeCommand = function(name, params) {
        if (presenter.configuration.isErrorMode) return;

        var commands = {
            'show': presenter.show,
            'hide': presenter.hide,
            'enable': presenter.enable,
            'disable': presenter.disable
        };

        Commands.dispatch(commands, name, params, presenter);
    };

    presenter.nextButtonTrigger = function() {
        // this allows to inject custom pages states into window object, which will be used instead of player state
        presenter.isAdaptivePreviewMode = window.adaptivePreviewMode ? true : false;


        var connections = presenter.adaptiveLearningService.getCurrentPageConnections();

        for (var i = 0; i < connections.length; i++) {
            var isMetCondition = presenter.evaluateCondition(connections[i].conditions);

            if (isMetCondition) {
                presenter.adaptiveLearningService.moveToNextPage(connections[i].target);
                return;
            }
        }
    };

    presenter.prevButtonTrigger = function() {
        presenter.adaptiveLearningService.moveToPrevPage();
    };


    presenter.triggerButtonClickedEvent = function() {
        if (presenter.playerController == null) return;

        if (presenter.configuration.Direction === presenter.BUTTON_TYPE.PREV) {
            presenter.prevButtonTrigger();
        } else {
            presenter.nextButtonTrigger();
        }
    };

    presenter.evaluateCondition = function(condition) {
        if (condition === '') {
            return true;
        }
        try {
            return eval(condition);
        } catch (e) {
            console.log(condition + ' error');
            return false;
        }
    };

    // needed for condition evaluation
    function expect(pageID) {
        if (presenter.isAdaptivePreviewMode) {
            return window.pagesScores[pageID];
        } else {
            var scoreService = presenter.playerController.getScore();

            return scoreService.getPageScoreById(pageID);
        }
    }


    presenter.setVisibility = function(isVisible) {
        presenter.state.isVisible = isVisible;
        presenter.$view.css("visibility", isVisible ? "visible" : "hidden");
    };

    presenter.show = function() {
        this.setVisibility(true);
        presenter.state.isVisible = true;
    };

    presenter.hide = function() {
        this.setVisibility(false);
        presenter.state.isVisible = false;
    };

    presenter.reset = function() {
        presenter.state.isErrorMode = false;
        presenter.state.isVisible = presenter.configuration.isVisible;
        if (presenter.configuration.isVisible) {
            this.show();
        } else {
            this.hide();
        }
        presenter.toggleDisable(this.configuration.isDisabledByDefault);
    };

    presenter.enable = function() {
        this.toggleDisable(false);
    };

    presenter.disable = function() {
        this.toggleDisable(true);
    };

    presenter.toggleDisable = function(disable) {
        var element = presenter.$view.find('div[class*=adaptive-next-button-element]:first');
        if(disable) {
            element.addClass("disable");
        } else {
            element.removeClass("disable");
        }
        presenter.state.isDisabled = disable;
    };

    presenter.getState = function() {
        return JSON.stringify({
            isVisible: presenter.state.isVisible,
            isDisabled: presenter.state.isDisabled
        });
    };

    presenter.setState = function(stateString) {
        if (ModelValidationUtils.isStringEmpty(stateString)) return;
        console.log(stateString);
        var state = JSON.parse(stateString);


        presenter.state.isDisabled = state.isDisabled;
        presenter.state.isVisible = state.isVisible;

        if (presenter.state.isVisible) {
            presenter.show();
        } else {
            presenter.hide();
        }

        presenter.toggleDisable(presenter.state.isDisabled);
    };

    presenter.setShowErrorsMode = function () {
        presenter.state.isErrorMode = true;
    };

    presenter.setWorkMode = function () {
        presenter.state.isErrorMode = false;
    };

    presenter.onEventReceived = function (eventName) {
        if (eventName == "ShowAnswers") {
            presenter.state.isErrorMode = true;
        }

        if (eventName == "HideAnswers") {
            presenter.state.isErrorMode = false;
        }
    };

    presenter.keyboardController = function(keyCode, isShiftDown, event) {
        event.preventDefault();
        if (keyCode == window.KeyboardControllerKeys.ENTER) {
            presenter.clickHandler();
        }
    };

    function getImageUrlFromResources (fileName) {
        if (!presenter.playerController) {
            return '';
        }
        return presenter.playerController.getStaticFilesPath() + 'addons/resources/' + fileName;
    }
    return presenter;
}