type Url = string

export type Message =
    | { type: 'OPEN_NEW_TAB'; url: Url }
    | { type: 'ACTIVATE' }
