import * as React from 'react';
import { NetworkGraphChart } from './NetworkGraph';
import { Dataset, Mode } from '../../types/Dataset';
// @ts-ignore
import Modal, { closeStyle } from 'simple-react-modal'
import { IpView } from '../../layouts/DetailView/IpView';
import { ConnectionView } from '../../layouts/DetailView/ConnectionView';
import * as d3 from 'd3';
import styles from './NetworkGraphModalWrapper.module.css';
import { Settings } from '../../layouts/Settings/Settings';
import { IpAddress } from '../Geo/geoUtils';
const Mousetrap = require('mousetrap');

interface NetworkGraphModalWrapperProps {
    dataset: Dataset;
    mode: Mode,
    switchModeInParent?: (newMode: Mode) => void,
    settings: Settings,
}

interface NetworkGraphModalWrapperState {
    ipModalOpen: boolean,
    modalIp: IpAddress;
    connectionModalOpen: boolean,
    connection: IpAddress[],
    previousModalsStack: (IpAddress | IpAddress[])[] // Stack of previously opened modals frr the Back button
}

/**
 * A wrapper component for the network graph than manages opening and closing of detail modols (IP Modal, Connection Modal),
 * and navigatiom between them
 */
export class NetworkGraphModalWrapper extends React.PureComponent<NetworkGraphModalWrapperProps, NetworkGraphModalWrapperState> {
    constructor(props: any) {
        super(props);
        this.state = {
            ipModalOpen: false,
            modalIp: '',
            connectionModalOpen: false,
            connection: [],
            previousModalsStack: []
        }
    }

    openIpModal = (ip: IpAddress, goingBack?: boolean) => {
        let newStack = this.getNewStack(goingBack);

        this.setState(() => ({
            modalIp: ip,
            ipModalOpen: true,
            connection: [],
            connectionModalOpen: false,
            previousModalsStack: newStack,
        }));
        Mousetrap.bind('esc', this.closeModal);
        d3.select('body').style('overflow', 'hidden');
    }

    openConnectionModal = (connection: IpAddress[], goingBack?: boolean) => {
        let newStack = this.getNewStack(goingBack);

        this.setState(() => ({
            modalIp: '',
            ipModalOpen: false,
            connection: [connection[0], connection[1]],
            connectionModalOpen: true,
            previousModalsStack: newStack,
        }));
        Mousetrap.bind('esc', this.closeModal);
        d3.select('body').style('overflow', 'hidden');
    }

    openPreviousModal = () => {
        let modal = this.state.previousModalsStack.pop();
        if (modal !== null && typeof modal === 'object') this.openConnectionModal(modal as unknown as string[], true);
        if (modal !== null && typeof modal === 'string') this.openIpModal(modal as string, true);
        else return;
    }

    closeModal = () => {
        console.log('pressed esc');
        this.setState(() => ({
            ipModalOpen: false,
            modalIp: '',
            connectionModalOpen: false,
            connection: [],
            previousModalsStack: []
        }));
        Mousetrap.unbind('esc');
        d3.select('body').style('overflow', 'visible');
    };

    private getNewStack(goingBack: boolean | undefined) {
        let newStack = [...this.state.previousModalsStack];
        let previousModal = getPreviousModal(this.state);
        if (previousModal !== null && !goingBack)
            newStack.push(previousModal);
        return newStack;
    }

    render() {
        return (
            <div>
                <NetworkGraphChart dataset={this.props.dataset} openIpModal={this.openIpModal} openConnectionModal={this.openConnectionModal} switchModeInParent={this.props.switchModeInParent} mode={this.props.mode} />
                <Modal show={this.state.ipModalOpen} style={{ zIndex: '1000', fontFamily: null }} containerClassName={styles.modalContainer} onClose={this.closeModal}>
                    <IpView
                        key={this.state.modalIp}
                        ip={this.state.modalIp}
                        dataset={this.props.dataset}
                        openIpModal={this.openIpModal}
                        openConnectionModal={this.openConnectionModal}
                        openPreviousModal={this.openPreviousModal}
                        previousModalAvailable={this.state.previousModalsStack.length > 0}
                        settings={this.props.settings}
                    />
                    <span style={closeStyle} onClick={this.closeModal}>X</span>
                </Modal>
                <Modal show={this.state.connectionModalOpen} style={{ zIndex: '1000', fontFamily: null }} containerClassName={styles.modalContainer} onClose={this.closeModal}>
                    <ConnectionView
                        connection={this.state.connection}
                        key={this.state.connection.toString()}
                        dataset={this.props.dataset}
                        openIpModal={this.openIpModal}
                        openConnectionModal={this.openConnectionModal}
                        openPreviousModal={this.openPreviousModal}
                        previousModalAvailable={this.state.previousModalsStack.length > 0}
                        settings={this.props.settings}
                    />
                    <span style={closeStyle} onClick={this.closeModal}>X</span>
                </Modal>
            </div>
        )
    }
};


const getPreviousModal = (state: NetworkGraphModalWrapperState) => {
    if (state.modalIp !== '') return state.modalIp;
    if (state.connection.length !== 0) return state.connection;
    return null;
}


