import { createGlobalStyle } from 'styled-components'
import { fontFamilies, colors } from './globals'

const tagInputPadding = 12;

const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
  }

  body, input, button {
    font-family: ${fontFamilies.primary};
  }

  * {
    box-sizing: border-box;
  }

  .react-tags {
    position: relative;
    width: 420px;
    border: 2px solid rgba(0, 0, 0, 0.1);
    border-radius: 5px;
    padding: ${tagInputPadding}px;
    padding-bottom: ${tagInputPadding - 4}px;
    
    /* shared font styles */
    font-size: 1em;
    line-height: 1.2;
  
    /* clicking anywhere will focus the input */
    cursor: text;
  }
  
  .react-tags.is-focused {
    border-color: #B1B1B1;
  }
  
  .react-tags__selected {
    display: inline;
  }
  
  .react-tags__selected-tag {
    display: inline-block;
    box-sizing: border-box;
    background: ${colors.action};
    border: none;
    border-radius: 3px;
    padding: 6px 8px;
    margin-right: 1rem;
    cursor: pointer;
  
    /* match the font styles */
    font-size: inherit;
    line-height: inherit;
  }
  
  .react-tags__selected-tag:after {
    position: relative;
    top: 1px;
    font-weight: bold;
    content: '\u2715';
    color: black;
    margin-left: 8px;
  }
  
  .react-tags__selected-tag:hover,
  .react-tags__selected-tag:focus {
    border-color: #B1B1B1;
  }
  
  .react-tags__search {
    display: inline-block;
  
    /* match tag layout */
    padding: 7px 2px;
    margin-bottom: 6px;
  
    /* prevent autoresize overflowing the container */
    max-width: 100%;
  }
  
  @media screen and (min-width: 30em) {
    .react-tags__search {
      /* this will become the offsetParent for suggestions */
      position: relative;
    }
  }
  
  .react-tags__search input {
    /* prevent autoresize overflowing the container */
    max-width: 100%;
  
    /* remove styles and layout from this element */
    margin: 0;
    padding: 0;
    border: 0;
    outline: none;
  
    /* match the font styles */
    font-size: inherit;
    line-height: inherit;
  }
  
  .react-tags__search input::-ms-clear {
    display: none;
  }
  
  .react-tags__suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
  }
  
  @media screen and (min-width: 30em) {
    .react-tags__suggestions {
      width: 240px;
    }
  }
  
  .react-tags__suggestions ul {
    margin: 4px -1px;
    padding: 0;
    list-style: none;
    background: white;
    border: 1px solid #D1D1D1;
    border-radius: 2px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }
  
  .react-tags__suggestions li {
    border-bottom: 1px solid #ddd;
    padding: 6px 8px;
  }
  
  .react-tags__suggestions li mark {
    text-decoration: underline;
    background: none;
    font-weight: 600;
  }
  
  .react-tags__suggestions li:hover {
    cursor: pointer;
    background: #eee;
  }
  
  .react-tags__suggestions li.is-active {
    background: #b7cfe0;
  }
  
  .react-tags__suggestions li.is-disabled {
    opacity: 0.5;
    cursor: auto;
  }
`

export default GlobalStyle