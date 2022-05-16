# AFrame-Outline

Use Instanced Meshes to draw an outline, it even works on skinned meshes.

<!--DOCS-->
Display an interactive HTML element in the scene.
### html-pointer component

| Property       | Type   | Description                                                                                   | Default         |
| :------------- | :----- | :-------------------------------------------------------------------------------------------- | :-------------- |
| activationType | string | Use an event for mouse down and up or proximity between two elements. One of event, proximity | "event"         |
| downEvents     | array  | Event to trigger 'mouseDown' events                                                           | ["selectstart"] |
| upEvents       | array  | Event to trigger 'mouseUp' events                                                             | ["selectend"]   |
| clickEvents    | array  | Event to trigger 'click' events                                                               | ["select"]      |

### html component

| Type     | Description          | Default |
| :------- | :------------------- | :------ |
| selector | HTML element to use. |         |

<!--DOCS_END-->
