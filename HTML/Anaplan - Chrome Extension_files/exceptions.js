define("anaplan/nls/exceptions", {
    root: ({
        _getLocalizedMessageTest: "passed",
        ServerTimeoutException: "The server has failed to respond in a timely fashion.",
        ServerTimeoutExceptionHelpMessage: "<ul><li><span>Please reload page</span></li><li><span>The model has likely been restored to its state prior to the last submission.</span></li></ul>",
        UnableToCommunicateWithServerException: "We have experienced a problem communicating with the Anaplan server.",
        UnableToCommunicateWithServerExceptionHelpMessage: "<ul><li><span>Please verify you are able to reach other sites on the Internet</span></li><li><span>If you are unable to load any pages, check your computer's network connection.</span></li><li><span>Otherwise please try again in a few moments.</span></li></ul>",
        InvalidDateException: "Invalid Date ${date}",
        InvalidNumberException: "Invalid Number ${number}",
        ServerException: "An error has occurred on the server.",
        ServerExceptionModelHasBeenRestored: "An error has occurred on the server. The model has been restored to its state prior to the last submission.",
        UnauthorizedUserException: "${user} does not have access to any models",
        UndoNotSuccessful: "The Undo operation was unsuccessful as the data in the grid was changed by another user.",
        UndoSystemFailed: "System Undo failed",
        UndoSystem : "System Undo"
    })
});
