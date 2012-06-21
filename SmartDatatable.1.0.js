/**
 * SmartDatatable
 * V.1.0
 * Require jQuery, Datatable YUI
 */
function _SmartDatatable(instance,columns,dataSource,configs){
  var oRef = this;
  
  this.init = function()
  {
    this.instance = typeof(instance) == "object" ? instance : $('#'+instance)[0];
    this.columns = columns;
    this.dataSource = dataSource;
    this.searchRequest = '';
    this.configs = {
      'rowHover':true, //el sombreado si el cursor pasa por encima de una fila
      'rowSelect':true, //se selecciona (sombrea) cuando se hace click
      'rowClick':false, //funcion a ejecutar cuado se hace click
      'rowDblClick':false, //funcion a ejecutar cuando se hace doble click
      'rowFormat':null,
      'params': null, //parametros que se envian
      'extraFields':[], //si se necesitan campos extra ademas de los que aparecen en las columnas
      'resultList':'result',// arreglo del que se va a obtener la ifnormacion del datatable,
      'dinamic':false, //si el datatable sera dinamico, es decir que se recargue por cada pagina
      'sort':'', //el campo con el que se ordenara en el datatable
      'dir':'asc',  // orden asc (ascendente) desc (descenente)
      'searchBox':null, //id o elemento para el campo de busqueda
      'paginator':null, //id o elemento para el paginador
      'paginatorTemplate':YAHOO.widget.Paginator.TEMPLATE_ROWS_PER_PAGE,
      'rowsPerPage':20, //registros por pagina
      'rowsPerPageOptions':[10,20,50,100],// opciones para cambiar los registros por pagina
      'pageLinks':10, //maximo de botones en el paginador
      'callback':function(){}, //callback al terminar de cargar la tabla
      'debug':false
    }
    
    //SE REMPLAZA LAS VARIABLES DEFAULT
    log('-- Se reemplazan variables Default --');
    if(typeof(configs) != "undefined"){
      $.each(configs,function(k,v){
        oRef.configs[k] = v;
      });
    }
    
    //SE HACE UN ARREGLO CON LOS CAMPOS A EXTRAER DE LA CONSULTA
    log('-- Creacion de array Fields --');
    this.configs.fields = Array();
    for(var i=0; i<columns.length ;i++){
      if(typeof(columns[i].key) != "undefined")
        this.configs.fields.push(columns[i].key);
    }
    for(i=0; i<this.configs.extraFields.length ;i++){
      this.configs.fields.push(this.configs.extraFields[i]);
    }
    delete this.configs.extraFields;
     
    //CONFIGURACIONES DATATABLE
    log('-- Configuraciones del datatable --');
    var direccion = this.configs.dir == 'desc' ? YAHOO.widget.DataTable.CLASS_DESC : YAHOO.widget.DataTable.CLASS_ASC;
    this.configs.datatable = {
      sortedBy : {key:this.configs.sort, dir:direccion},
      MSG_ERROR:'Error al obtener registros',
      MSG_LOADING:'Procesando informaci&oacute;n...',
      MSG_EMPTY :'No hay registros'
    }
    
    ///ROW FORMAT
    log('-- Row Format --');
    if(typeof(this.configs.rowFormat) != null)
      this.configs.datatable.formatRow = this.configs.rowFormat
    
    //SEARCH BOX
    log('-- se construye SearchBox --');
    if(this.configs.searchBox != null)
      this.searchBox = _BuildSearchBox();
    
    //PAGINADOR
    log('-- Se configura paginador --');
    if(this.configs.paginator != null){
      var paginator = typeof(this.configs.paginator) == "object" ? this.configs.paginator : $('#'+this.configs.paginator)[0];
      $(paginator).addClass('smart_dt_paginator');
      this.configs.datatable.paginator = new YAHOO.widget.Paginator({
          containers: paginator,
          rowsPerPage:this.configs.rowsPerPage,
          template: this.configs.paginatorTemplate,
          rowsPerPageOptions: this.configs.rowsPerPageOptions,
          pageLinks: this.configs.pageLinks,
          firstPageLinkLabel : "Primera",
          previousPageLinkLabel : "Anterior",
          nextPageLinkLabel : "Siguiente",
          lastPageLinkLabel : "Ultima"
      });
      this.oPaginator = this.configs.datatable.paginator;
    }
    
    
    //INITIAL REQUEST
    log('-- initial Request --');
    oRef.configs.datatable.initialRequest = _getParams(true);
    
        
    // DATATABLE DINAMICO
    log('-- datatable dinamico --');
    if(this.configs.dinamic){
      this.configs.datatable.dynamicData = true;
      this.configs.datatable.generateRequest = function(oState, oSelf){
        log('-- Peticion Dinamica --');
        oState = oState || {pagination:null};
        var direccion = oState.sortedBy.dir == "yui-dt-desc" ? 'desc' : 'asc';
        var params =  _getParams()+ "startIndex="+ oState.pagination.recordOffset +"&limit="+oState.pagination.rowsPerPage+
                     "&sort="+oState.sortedBy.key+"&dir="+direccion;
        return params;
      };
    }
    
    //DATASOURCE
    log('-- DataSource --');
    this.oDataSource = new YAHOO.util.DataSource(this.dataSource+'?');
    this.oDataSource.responseType = YAHOO.util.DataSource.TYPE_JSON;
    this.oDataSource.responseSchema = {
      resultsList: this.configs.resultList,
      fields: this.configs.fields,
      metaFields: {totalRecords: "totalRecords",startIndex:'startIndex'}
    };
    //myDataSource.connMethodPost = true;
    
    
    //CREACION DATATABLE
    log('-- Creacion Datatable --');
    this.oDatatable = new YAHOO.widget.DataTable(this.instance, this.columns, this.oDataSource, this.configs.datatable);
    this.oDatatable.handleDataReturnPayload = function(oRequest, oResponse, oPayload){
      log('-- Datatable Callback --');
      oRef.configs.callback();
      oPayload.totalRecords = oResponse.meta.totalRecords;
      return oPayload;
    }
    
    // DATATABLE ROW EVENTS
    log('-- Datatable Row Events --');

    if(this.configs.rowHover){
      this.oDatatable.subscribe("rowMouseoverEvent", this.oDatatable.onEventHighlightRow);
      this.oDatatable.subscribe("rowMouseoutEvent", this.oDatatable.onEventUnhighlightRow);
    }
    
    var fnClick = function(J){
      log('-- Datatable Row Click Event --');
      if(oRef.configs.rowSelect){
        var I = this.get("selectionMode");
        if (I == "single")
          this._handleSingleSelectionByMouse(J);
        else
          this._handleStandardSelectionByMouse(J);
      }
      if(oRef.configs.rowClick != false){
        oRef.configs.rowClick(J);
      }
    }
    this.oDatatable.subscribe("rowClickEvent", fnClick);
    
    if(this.configs.rowDblClick){
      var rowdblClick = function(o){
        log('-- Datatable Row DblClick Event --');
        var row = oRef.oDatatable.getRecordSet().getRecord( o.target.id );
        oRef.configs.rowDblClick(o,row);
      }
      this.oDatatable.subscribe("rowDblclickEvent",rowdblClick);
    }
  }
    
  this.addRow = function(row,data){
    return this.oDatatable.addRow(row,data);
  }
  
  this.updateRow = function(row,data){
    return this.oDatatable.updateRow(row,data);
  }
  
  this.deleteRow = function(row){
    return this.oDatatable.deleteRow(row);
  }
  
  this.getRecord = function(idTr){
    return this.oDatatable.getRecordSet().getRecord(idTr);
  }

  /** recarga el datatable a su primera pagina con los nuevos parametros */
  this.load = function()
  { 
    log('-- function load() --');
    oRef.searchRequest = '';
    //oRef.configs.datatable.paginator.setState({recordOffset:1});
    this.oDatatable.load({request:_getParams(true)});
  }

  this.search = function(search){
    log('-- function search() --');
    oRef.searchRequest = search;
    oRef.configs.datatable.paginator.setState({recordOffset:1});
    this.oDatatable.load({request:_getParams(true)});
  }
  
  /** regresa el datatable a su configuracion inicial  */
  this.reset = function(){
    
  }
  
  
  var _getParams = function(initial)
  {  
    log('-- parametros --');
    
    //PARAMETROS
    var params = typeof(oRef.configs.params) == "function" ? oRef.configs.params() : oRef.configs.params;    
    params = (params == '') ? '' : params+'&';
    
    //SEARCH REQUEST
    //var searchRequest = (typeof(oRef.searchRequest) != "undefined") ? encodeURI(oRef.searchRequest) : "" ;
    params+= (oRef.searchRequest == '') ? '' : 'search='+encodeURIComponent(oRef.searchRequest)+'&';
    
    if(typeof(initial) != "undefined" && initial){
      if(oRef.configs.dinamic)
        params+= 'sort='+oRef.configs.sort+'&dir='+oRef.configs.dir+'&startIndex=0&limit='+oRef.configs.rowsPerPage;
     /* else
        params+= 'sort='+oRef.configs.sort+'&dir='+oRef.configs.dir;*/
    }
    
    return params
  }
  
  
  /**
   * construye el campod e busqueda
   */
  var _BuildSearchBox = function(){
    
    var searchBox = typeof(oRef.configs.searchBox) == "object" ? oRef.configs.searchBox : $('#'+oRef.configs.searchBox);
    searchBox.addClass('smart_dt_searchbox');
    //searchBox.css({width:171,background:'url(/images/icons/20x20/search.png) no-repeat 100% #fff',padding:'2px 0px 2px 2px'});
    var html = '<input type="text" style="width: 150px; background: none repeat scroll 0% 0% transparent; border: 0px none;">'+
                   '<span style="padding: 5px 8px; cursor: pointer;"></span>';
    searchBox.html(html);
    var input = searchBox.find('input');
    var button = searchBox.find('span');
    
    var fnSearch = function(text){
      //oRef.searchRequest = input.val();
      oRef.search(input.val());
      //oRef.load();
    }
    var fnEnter = function(e){
      var tecla = (document.all) ? e.keyCode : e.which;
      return (tecla != 13) ? true : fnSearch();
    }
    
    input.keypress(fnEnter);
    button.click(function(){fnSearch()});
    
    return {searchBox:searchBox[0],input:input[0],button:button[0]};
  }
  
  
  /**
   * sirve para depurar
   */
  var log = function(obj){
    if(oRef.configs.debug && window.console && window.console.log)
      window.console.log(obj);
  }
  this.init();
}