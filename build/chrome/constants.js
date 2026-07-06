export const DEFAULT_SETTINGS = {
    status: true,
    blurryStartMode: false,
    blurAmount: 20,
    blurImages: true,
    blurVideos: true,
    blurMale: false,
    blurFemale: true,
    unblurImages: false,
    unblurVideos: false,
    gray: true,
    strictness: 0.5,
    whitelist: [],
    blurMode: "BLUR",
    genderScope: "EXCEPT_FACE",
};

export const STATUSES = {
    ERROR: "-1ERROR",
    OBSERVED: "0OBSERVED",
    QUEUED: "1QUEUED",
    LOADING: "2LOADING",
    LOADED: "3LOADED",
    PROCESSING: "4PROCESSING",
    PROCESSED: "5PROCESSED",
    DISABLED: "9DISABLED",
};
