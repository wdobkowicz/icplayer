TestCase("[MathText] Check answers tests", {
    setUp: function () {
        this.presenter = AddonMathText_create();

        // stubs
        this.stubs = {
            setWorkModeStub: sinon.stub(),
            hideAnswersStub: sinon.stub(),
            setToolbarHiddenStub: sinon.stub(),
            findStub: sinon.stub(),
            attrStub: sinon.stub(),
            removeAttrStub: sinon.stub()
        };

        this.stubs.findStub.returns({
            attr: this.stubs.attrStub,
            removeAttr: this.stubs.removeAttrStub
        });

        // inner states
        this.presenter.state = {
            isShowAnswers: false,
            isCheckAnswers: false,
            hasUserInteracted: true
        };

        this.presenter.configuration = {
            isActivity: true,
        };

        // presenter mocking
        this.presenter.editor = {
            setToolbarHidden: this.stubs.setToolbarHiddenStub,
        };

        this.presenter.$view = {
            find: this.stubs.findStub
        };
    },

    'test setDisabled should unset check answers and show answers': function(){
        this.presenter.setDisabled(true);

        assertTrue(this.stubs.setWorkModeStub.called);
        assertTrue(this.stubs.hideAnswersStub.called);
    },

     'test should set isDisabled state to true': function(){
        this.presenter.setDisabled(true);

        assertTrue(this.presenter.state.isDisabled);
    },

    'test should set isDisabled state to false': function(){
        this.presenter.setDisabled(false);

        assertFalse(this.presenter.state.isDisabled);
    },

    'test should disable input and hide toolbar when set to disable': function () {
        this.presenter.setDisabled(true);

        assertTrue(this.stubs.attrStub.calledWith('disabled'));
        assertTrue(this.stubs.setToolbarHiddenStub.calledWith(true));
    },

    'test should not disable input and hide toolbar when set to enable': function () {
        this.presenter.setDisabled(false);

        assertTrue(this.stubs.removeAttrStub.calledWith('disabled'));
        assertTrue(this.stubs.setToolbarHiddenStub.calledWith(false));
    }


});