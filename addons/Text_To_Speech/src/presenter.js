function AddonText_To_Speech_create() {

    function returnErrorObject(ec) { return { isValid: false, errorCode: ec }; }
    function returnCorrectObject(v) { return { isValid: true, value: v }; }

    var presenter = function () {};

    presenter.messagesQueue = [];

    presenter.ERROR_CODES = {
        C01: 'Configuration cannot be empty',

        S01: 'Sorry, your browser does not support speech synthesis.'
    };

    presenter.LANGUAGES_CODES = {
        English: 'en-US',
        Polski: 'pl-PL',
        Deutsch: 'de-DE'
    };

    presenter.INPUTS_TRANSLATIONS = {
        'en-US': {
            '1': 'Gap number ',
            '2': 'Option gap number ',
            '3': 'Math gap number ',
            '4': 'Filled gap number '
        },
        'pl-PL': {
            '1': 'Luka numer ',
            '2': 'Opcja wielokrotnego wyboru numer ',
            '3': 'Luka matematyczna numer ',
            '4': 'Wypełniona luka numer '
        },
        'de-DE': {
            '1': 'Gap number ',
            '2': 'Option gap number ',
            '3': 'Math gap number ',
            '4': 'Filled gap number '
        }
    };

    function parseConfiguration (configuration) {
        if (!configuration) {
            return returnErrorObject('C01');
        }

        var addOnsTextToSpeechData = [];
        for (var i=0; i<configuration.length; i++) {
            addOnsTextToSpeechData.push({
                id: configuration[i].ID,
                title: configuration[i].Title,
                description: configuration[i].Description
            });
        }

        return returnCorrectObject(addOnsTextToSpeechData);
    }

    function parseLanguage (language) {
        return returnCorrectObject(presenter.LANGUAGES_CODES[language || 'English']);
    }

    presenter.validateModel = function (model) {
        var validatedConfiguration = parseConfiguration(model['configuration']);
        if (!validatedConfiguration.isValid) {
            return returnErrorObject(validatedConfiguration.errorCode);
        }

        var validatedLanguage = parseLanguage(model['language']);
        if (!validatedLanguage.isValid) {
            return returnErrorObject(validatedLanguage.errorCode);
        }

        return {
            ID: model.ID,
            isVisible: ModelValidationUtils.validateBoolean(model['Is Visible']),
            isValid: true,

            addOnsConfiguration: validatedConfiguration.value,
            language: validatedLanguage.value
        }
    };

    function loadVoices () {
        presenter.configuration.voices = window.speechSynthesis.getVoices();
    }

    presenter.presenterLogic = function (view, model, isPreview) {
        presenter.$view = $(view);
        presenter.$view[0].addEventListener('DOMNodeRemoved', presenter.destroy);
        presenter.configuration = presenter.validateModel(model);
        if (!presenter.configuration.isValid) {
            DOMOperationsUtils.showErrorMessage(view, presenter.ERROR_CODES, presenter.configuration.errorCode);
            return false;
        }

        loadVoices();
        window.speechSynthesis.onvoiceschanged = function (e) {
            loadVoices();
        };

        if ('speechSynthesis' in window) {

        } else {
            DOMOperationsUtils.showErrorMessage(view, presenter.ERROR_CODES, 'S01');
            return false;
        }

        presenter.setVisibility(presenter.configuration.isVisible);

        return false;
    };

    presenter.run = function (view, model) {
        presenter.presenterLogic(view, model, false);
    };

    presenter.createPreview = function (view, model) {
        presenter.presenterLogic(view, model, true);
    };

    function getAddOnConfiguration (id) {
        id = Array.isArray(id) ? id[0] : id;

        for (var i=0; i<presenter.configuration.addOnsConfiguration.length; i++) {
            var conf = presenter.configuration.addOnsConfiguration[i];

            if (conf.id === id) {
                return conf;
            }
        }

        return {title: '', description: ''};
    }

    function parseGaps (text) {
        var gap = 0;
        var option = 0;
        var math = 0;
        var filledGap = 0;

        while (text.indexOf('#1#') !== -1 || text.indexOf('#2#') !== -1 || text.indexOf('#3#') !== -1 || text.indexOf('#4#') !== -1) {
            if (text.indexOf('#1#') !== -1) {
                text = text.replace('#1#', ' ' + presenter.INPUTS_TRANSLATIONS[presenter.configuration.language]['1'] + ++gap + ' ');
            }

            if (text.indexOf('#2#') !== -1) {
                text = text.replace('#2#', ' ' + presenter.INPUTS_TRANSLATIONS[presenter.configuration.language]['2'] + ++option + ' ');
            }

            if (text.indexOf('#3#') !== -1) {
                text = text.replace('#3#', ' ' + presenter.INPUTS_TRANSLATIONS[presenter.configuration.language]['3'] + ++math + ' ');
            }

            if (text.indexOf('#4#') !== -1) {
                text = text.replace('#4#', ' ' + presenter.INPUTS_TRANSLATIONS[presenter.configuration.language]['4'] + ++filledGap + ' ');
            }
        }

        return text;
    }

    function getLanguageObject (lang) {
        loadVoices();
        for (var i=0; i<presenter.configuration.voices.length; i++) {
            if (presenter.configuration.voices[i].lang === lang) {
                return presenter.configuration.voices[i];
            }
        }

        return presenter.configuration.voices[0];
    }

    presenter.speak = function (text) {
        text = parseGaps(text);

        // if (window.speechSynthesis.speaking) {
        //     window.speechSynthesis.cancel();
        // }

        var msg = new SpeechSynthesisUtterance(text);
        msg.volume = parseFloat(1); // 0 - 1
        msg.rate = parseFloat(1); // 0 - 10
        msg.pitch = parseFloat(1); // 0 - 2
        msg.voice = getLanguageObject(presenter.configuration.language);

        window.speechSynthesis.speak(msg);
    };

    // var speakTimeout = null;
    // presenter.speak = function (text) {
    //     text = parseGaps(text);
    //
    //     if (window.speechSynthesis.speaking) {
    //         speechSynthesis.cancel();
    //
    //         if (speakTimeout) {
    //             clearTimeout(speakTimeout);
    //         }
    //
    //         speakTimeout = setTimeout(function () { presenter.speak(text); }, 250);
    //     } else {
    //         var msg = new SpeechSynthesisUtterance(text);
    //         msg.volume = parseFloat(1); // 0 - 1
    //         msg.rate = parseFloat(1); // 0 - 10
    //         msg.pitch = parseFloat(1); // 0 - 2
    //         msg.voice = getLanguageObject(presenter.configuration.language);
    //
    //
    //         window.speechSynthesis.speak(msg);
    //         msg.onend = function () {};
    //     }
    // };

    presenter.getGapAppearanceAtIndexOfType = function (gaps, gapNumber) {
        var index = 0;

        for (var i=0; i<gapNumber; i++) {
            if (gaps[i] === gaps[gapNumber-1]) {
                index++;
            }
        }

        return index;
    };

    presenter.readGap = function (text, currentGapContent, gapNumber) {
        var gaps = text.match(/#[1-4]#/g);
        var gapTypeNumber = gaps[gapNumber][1];

        var gapTypeRead = presenter.INPUTS_TRANSLATIONS[presenter.configuration.language][gapTypeNumber];
        var gapNumberRead = presenter.getGapAppearanceAtIndexOfType(gaps, gapNumber) + 1;

        presenter.speak(gapTypeRead + ' ' + gapNumberRead + ' ' + currentGapContent);
    };

    presenter.playTitle = function (id) {
        if (id) {
            presenter.speak(getAddOnConfiguration(id).title);
        }
    };

    presenter.playDescription = function (id) {
        if (id) {
            presenter.speak(getAddOnConfiguration(id).description);
        }
    };

    presenter.getAddOnsOrder = function () {
        return presenter.configuration.addOnsConfiguration.map(function (c) {
            return c.id;
        });
    };

    function parseMultiPartDescription (text) {
        if (text === '') {
            return [];
        }

        return text.split('[PART]').map(function (option) {
            return option.trim();
        });
    }

    presenter.getMultiPartDescription = function (id) {
        return parseMultiPartDescription(getAddOnConfiguration(id).description);
    };

    presenter.setVisibility = function (isVisible) {
        presenter.$view.css("visibility", isVisible ? "visible" : "hidden");
    };

    presenter.show = function () {
        presenter.setVisibility(true);
        presenter.configuration.isVisible = true;
    };

    presenter.hide = function () {
        presenter.setVisibility(false);
        presenter.configuration.isVisible = false;
    };

    presenter.executeCommand = function (name, params) {
        if (!presenter.configuration.isValid) {
            return;
        }

        var commands = {
            "show": presenter.show,
            "hide": presenter.hide,
            "playTitle": presenter.playTitle,
            "playDescription": presenter.playDescription,
            "speak": presenter.speak,
            "readGap": presenter.readGap,
            "getAddOnsOrder": presenter.getAddOnsOrder,
            "getMultiPartDescription": presenter.getMultiPartDescription
        };

        Commands.dispatch(commands, name, params, presenter);
    };

    presenter.getState = function() {
        return JSON.stringify({
            addOnsConfiguration: presenter.configuration.addOnsConfiguration,
            language: presenter.configuration.language,
            isVisible: presenter.configuration.isVisible
        });
    };

    presenter.setState = function (state) {
        if (ModelValidationUtils.isStringEmpty(state)) {
            return;
        }

        var parsedState = JSON.parse(state);

        presenter.configuration.addOnsConfiguration = parsedState.addOnsConfiguration;
        presenter.configuration.language = parsedState.language;
        presenter.configuration.isVisible = parsedState.isVisible;

        presenter.setVisibility(presenter.configuration.isVisible);
    };

    presenter.destroy = function () {
        presenter.$view[0].removeEventListener('DOMNodeRemoved', presenter.destroy);

        window.speechSynthesis.cancel();
    };

    return presenter;
}