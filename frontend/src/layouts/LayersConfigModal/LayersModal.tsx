import * as React from 'react';
// @ts-ignore
import Modal, { closeStyle } from 'simple-react-modal';
import * as d3 from 'd3';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableLocation } from 'react-beautiful-dnd';
import { layerString, propertyDisplayNames } from '../../utils/statsUtils';
import { layerStringArray } from '../../utils/statsUtils';
import styles from './layersModal.module.css'
const Mousetrap = require("mousetrap");

interface ChangeLayersModalProps {
    layers: layerString[];
    changeLayers: (newLayers: layerString[]) => void;
}

interface ChangeLayersModalState {
    modalOpen: boolean,
    items: Item[],
    selected: Item[],
}

interface Item {
    id: string;
    content: string;
}

interface MoveResult {
    items: Item[];
    selected: Item[];
}

/**
 * Component that handles opening a modal with drag & drop user interface to configuring filtrataion layers
 */
export class ChangeLayersModal extends React.PureComponent<ChangeLayersModalProps, ChangeLayersModalState> {
    constructor(props: ChangeLayersModalProps) {
        super(props);
        this.state = {
            modalOpen: false,
            items: [],
            selected: [],
        }
        this.listRef = React.createRef();
    }

    listRef: React.RefObject<HTMLDivElement>;

    closeModal = () => {
        console.log('Closing modal');
        this.setState(() => ({
            modalOpen: false
        }));
        Mousetrap.unbind("esc");
        Mousetrap.unbind("enter");
        d3.select('body').style('overflow', 'visible');
    };

    openModal = () => {
        this.setState(() => ({
            modalOpen: true
        }));
        Mousetrap.bind("esc", this.saveLayers);
        Mousetrap.bind("enter", this.saveLayers);
        d3.select('body').style('overflow', 'hidden');
        this.listRef.current?.focus();
    }

    saveLayers = () => {
        let newLayers = this.state.selected.map((item) => item.id) as layerString[];
        this.props.changeLayers(newLayers);
        this.closeModal();
    }

    getList = (id: string) => {
        if (id === 'items') return this.state.items;
        else return this.state.selected;
    }

    onDragEnd = (result: DropResult) => {
        const { source, destination } = result;

        // dropped outside the list
        if (!destination) {
            return;
        }

        if (source.droppableId === destination.droppableId) {
            const items = reorder(
                this.getList(source.droppableId),
                source.index,
                destination.index
            );

            let state: ChangeLayersModalState = { ...this.state };
            if (source.droppableId === "selected") {
                state = { ...this.state, selected: items };
            } else if (source.droppableId === "items") {
                state = { ...this.state, items }
            }

            this.setState(state);
        } else {
            const result = move(
                this.getList(source.droppableId),
                this.getList(destination.droppableId),
                source,
                destination
            );

            this.setState({
                items: result.items,
                selected: result.selected
            });
        }
    };

    handleClickSelected = (oldIndex: number, oldListId: string, newListId: string) => {
        let oldList = this.getList(oldListId);
        let newList = this.getList(newListId);
        let newIndex = newList.length;
        const result = move(
            oldList,
            newList,
            {
                droppableId: oldListId,
                index: oldIndex
            },
            {
                droppableId: newListId,
                index: newIndex
            }
        );
        this.setState({
            items: result.items,
            selected: result.selected
        });

    }

    componentDidMount() {
        this.setState(() => ({
            selected: makeItems(this.props.layers),
            items: makeItems(layerStringArray.filter(layer => !this.props.layers.includes(layer)))
        }))
    }

    componentDidUpdate(prevProps: ChangeLayersModalProps) {
        if (this.props !== prevProps) {
            this.setState(() => ({
                selected: makeItems(this.props.layers),
                items: makeItems(layerStringArray.filter(layer => !this.props.layers.includes(layer)))
            }))
        }
    }

    render() {
        return (
            <React.Fragment>
                <button onClick={this.openModal} >Edit layers</button>
                <Modal
                    show={this.state.modalOpen}
                    style={{ zIndex: '1000' }}
                    containerClassName={styles.layersModalContainer}
                    onClose={this.saveLayers}>
                    <h2>Change Filtration Layers</h2>
                    <span style={closeStyle} onClick={this.saveLayers}>X</span>
                    <div className={styles.columnTitles}>
                        <div><h3>Used</h3></div>
                        <div><h3>Unused</h3></div>
                    </div>
                    <div className={styles.layersDND} ref={this.listRef}>
                        <DragDropContext onDragEnd={this.onDragEnd}>
                            <Droppable droppableId="selected">
                                {(provided, snapshot) => (
                                    <div id={styles.usedColumn} className="paper"
                                        ref={provided.innerRef}
                                        style={getListStyle(snapshot.isDraggingOver)}>
                                        {this.state.selected.map((item, index) => (
                                            <Draggable
                                                key={item.id}
                                                draggableId={item.id}
                                                index={index}>
                                                {(provided, snapshot) => (
                                                    <div onClick={() => this.handleClickSelected(index, 'selected', 'items')}
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={getItemStyle(
                                                            snapshot.isDragging,
                                                            'selected',
                                                            provided.draggableProps.style
                                                        )}>
                                                        {item.content}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                            <Droppable droppableId="items">
                                {(provided, snapshot) => (
                                    <div
                                        className="paper"
                                        ref={provided.innerRef}
                                        style={getListStyle(snapshot.isDraggingOver)}>
                                        {this.state.items.map((item, index) => (
                                            <Draggable
                                                key={item.id}
                                                draggableId={item.id}
                                                index={index}>
                                                {(provided, snapshot) => (
                                                    <div onClick={() => this.handleClickSelected(index, 'items', 'selected')}
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={getItemStyle(
                                                            snapshot.isDragging,
                                                            'items',
                                                            provided.draggableProps.style
                                                        )}>
                                                        {item.content}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                    <button autoFocus className={styles.saveLayersButton} onClick={this.saveLayers}>Save and Close</button>
                    <button className={styles.saveLayersButton} onClick={this.closeModal}>Cancel</button>
                </Modal>
            </React.Fragment>

        )
    }
}

// Tranforms list of listration layers into drag and drop items
const makeItems = (layers: layerString[]): Item[] => {
    return layers.map(layer => {
        let layerName = layer;
        
        if (layer === 'sourceIp' || layer === 'destinationIp') layerName = 'Ip';
        if (layer === 'sourcePort' || layer === 'destinationPort') layerName = 'Port';

        return ({
            id: layer,
            content: propertyDisplayNames[layerName],
        })
    })
}

// reordering the result
const reorder = (list: Item[], startIndex: number, endIndex: number): Item[] => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};

// Moves an item from one list to another list.
const move = (source: Item[], destination: Item[], droppableSource: DraggableLocation, droppableDestination: DraggableLocation): MoveResult => {
    const sourceClone = [...source];
    const destClone = [...destination];
    const [removed] = sourceClone.splice(droppableSource.index, 1);

    destClone.splice(droppableDestination.index, 0, removed);

    const result: any = {};
    result[droppableSource.droppableId] = sourceClone;
    result[droppableDestination.droppableId] = destClone;

    return result as MoveResult;
};

const grid = 6;

const getItemStyle = (isDragging: boolean, listId: string, draggableStyle: any) => ({
    userSelect: 'none',
    padding: grid * 1,
    margin: `0 0 ${grid}px 0`,
    borderRadius: '7px',
    textTransform: 'capitalize',

    // change background colour if dragging
    // background: isDragging ? 'lightgrey' : 'lightgrey',
    background: listId === 'selected' ? '#F08080' : '#3B82F6',
    color: listId === 'selected' ? 'black' : 'white',

    // styles we need to apply on draggables
    ...draggableStyle
});

const getListStyle = (isDraggingOver: boolean) => ({
    background: isDraggingOver ? 'white' : 'white',
    border: '1px solid lightgray',
    padding: grid,
    width: 250,
    borderRadius: '5px',
});
