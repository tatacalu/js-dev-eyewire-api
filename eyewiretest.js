/**
 * JavaScript code sample - demo usage of the NEW EyeWire Public REST API.
 * 
 * Tested only on a local server - http://localhost/
 */

(function(){
  "use strict"; // ECMAScript 5 Strict mode
  
  // ---------- START Constants ----------------------------------------------------------------------------------------
  var MIP_LEVEL = '0';
  var SLICING_XY = 'xy';
  var SLICING_XZ = 'xz';
  var SLICING_ZY = 'zy';
  var FIRST_TILE_INDEX = 0;
  var CHUNK_SIZE = 128;
  var VOLUME_SIZE = 256;
  var CHUNK_COORDINATES = [
    {x: 0, y: 0, z: 0},
    {x: 0, y: 0, z: 1},
    {x: 0, y: 1, z: 0},
    {x: 0, y: 1, z: 1},
    {x: 1, y: 0, z: 0},
    {x: 1, y: 0, z: 1},
    {x: 1, y: 1, z: 0},
    {x: 1, y: 1, z: 1},
  ];

  var IMG_CONTAINER_DIV_ID_PREFIX = 'imgContainer_';
  var TILE_IMG_ID_PREFIX          = 'tileImg_';

  // ---------- END Constants ------------------------------------------------------------------------------------------

  /**
   * Generates the ID of a tile DOM/HTML IMG Element. 
   * 
   * @param {Number} minBoundX The minimum bound of the image on the X axis
   * @param {Number} minBoundY The minimum bound of the image on the Y axis
   * @param {Number} z The coordinate of the image on the Z axis
   * @returns {String} The ID of a tile IMG Element depending on the input parameters
   */
  function getImageDomElementId(minBoundX, minBoundY, z) {
    return TILE_IMG_ID_PREFIX + minBoundX + '_' + minBoundY + '_' + z;
  }

  /**
   * Generates the URL upon which an AJAX/CORS GET request will be made in order to get the EM Image tiles.
   * 
   * @param {Number} volumeId The ID of the volume for which to get the tile data
   * @param {String} slicing The plane of slicing; possible values: 'xy', 'xz', 'yz'
   * @param {Number} chunkPositionX 0 or 1 - the chunk X position relative to the volume
   * @param {Number} chunkPositionY 0 or 1 - the chunk Y position relative to the volume
   * @param {Number} chunkPositionZ 0 or 1 - the chunk Z position relative to the volume
   */
  function getTilesForVolumeURL(volumeId, slicing, chunkPositionX, chunkPositionY, chunkPositionZ) {
    // !!! HTTPS Not configured properly !!! the certificate for data.eyewire.org is issued to eyewire.org
    // CORS-enabled API end-point; 
	  return 'http://data.eyewire.org/volume/' + volumeId + '/chunk/' + MIP_LEVEL + "/"
	  	+ chunkPositionX + "/" + chunkPositionY + "/" + chunkPositionZ + "/"
	  	+ "tile/" + slicing + "/" + FIRST_TILE_INDEX + ":" + CHUNK_SIZE;
  }

  /**
   * Perform the actual AJAX/CORS GET request to get the EM Image tiles for a certain chunk.
   * 
   * @param {Number} volumeId The ID of the volume for which to get the tile data
   * @param {String} slicing The plane of slicing; possible values: 'xy', 'xz', 'yz'
   * @param {Number} chunkPositionX 0 or 1 - the chunk X position relative to the volume
   * @param {Number} chunkPositionY 0 or 1 - the chunk Y position relative to the volume
   * @param {Number} chunkPositionZ 0 or 1 - the chunk Z position relative to the volume
   */
  function getTilesForVolume(volumeId, slicing, chunkPositionX, chunkPositionY, chunkPositionZ) {
    var urlString = getTilesForVolumeURL(volumeId, SLICING_XY, chunkPositionX, chunkPositionY, chunkPositionZ);
    console.log("urlString: %s", urlString);

    var imagesContainerDivJQ = $('#imagesContainer');

    $.ajax(urlString)
    .done(function(getTilesForVolumeResponse) {
      console.log("getTilesForVolumeResponse: %O", getTilesForVolumeResponse); 
      
      // sanity check
      if (getTilesForVolumeResponse.length != CHUNK_SIZE) {
        console.error("Validation check failure! Array size different from %d", CHUNK_SIZE);
        return;
      }

      for (var i = 0; i < CHUNK_SIZE; i++) {
        var currTile = getTilesForVolumeResponse[i];
        var currImgDomElementId = getImageDomElementId(currTile.bounds.min.x, currTile.bounds.min.y, currTile.bounds.min.z)
        var currJQuerySelector = 'img#' + currImgDomElementId;

        // populate the src attribute with the new data [base64]
        $(currJQuerySelector).attr("src", currTile.data);
      }
    });
  }

  /**
   * Function that processes the AJAX/CORS response to the POST call made on https://eyewire.org/2.0/tasks/testassign
   * 
   * This function generates all the IMGs and their containing DIVs which will be populated with image data subsequently. 
   * 
   * @param {Object} taskResponse the response to the call described above
   */
  function processAssignTaskResponse(taskResponse) {
    console.log("taskResponse: %O", taskResponse); // Formats the value as an expandable JavaScript object [Chrome].

    var volumeId = taskResponse.channel_id;

    // sanity check
    var maxBound = taskResponse.bounds.max;
    var minBound = taskResponse.bounds.min;

    if ((maxBound.x - minBound.x != VOLUME_SIZE) || (maxBound.y - minBound.y != VOLUME_SIZE) 
      || (maxBound.z - minBound.z != VOLUME_SIZE)) {
      console.error("Validation check failure! Bounds difference different from %d", VOLUME_SIZE);
      return;
    }

    // generate the image container DIVs; 256 in total; each div will hold 4 images
    var imagesContainerDivJQ = $('#mainContainer');
    for (var currZCoordinate = minBound.z; currZCoordinate < maxBound.z; currZCoordinate++) {

      // the IDs of the DIVs will have the pattern 'imgContainer_Z', where Z is the Z coordonate of the tiles that
      // will be contained inside it
      var currentImgContainerDiv = $("<div>", {
        id: IMG_CONTAINER_DIV_ID_PREFIX + currZCoordinate
      }).addClass('imgContainer');

      // generate the 4 images for each image container
      // the IDs of the IMGs will have the pattern tileImg_MINX_MINY_Z, where MINX is the minimum bound on X, 
      // MINY is the minimum bound on Y and Z is the Z coord
      var newImgIds = [
        getImageDomElementId(minBound.x, minBound.y, currZCoordinate),
        getImageDomElementId(minBound.x + CHUNK_SIZE, minBound.y, currZCoordinate),
        getImageDomElementId(minBound.x, minBound.y + CHUNK_SIZE, currZCoordinate),
        getImageDomElementId(minBound.x + CHUNK_SIZE, minBound.y + CHUNK_SIZE, currZCoordinate)
      ];

      for (var i = 0; i < 4; i++) {
          $("<img />", {
          id: newImgIds[i],
          alt: newImgIds[i]
        }).appendTo(currentImgContainerDiv);  
      } 

      // append the container div to the main container
      currentImgContainerDiv.appendTo(imagesContainerDivJQ);
    }

    // get the actual tile data
    for (i = 0; i < CHUNK_COORDINATES.length; i++) {
      getTilesForVolume(volumeId, SLICING_XY, CHUNK_COORDINATES[i].x, CHUNK_COORDINATES[i].y, CHUNK_COORDINATES[i].z);
    }
    
  }
  // -------------------------------------------------------------------------------------------------------------------

  // ==> JS Entry Point here 
  // CORS-enabled API end-point; 
  $.ajax("https://eyewire.org/2.0/tasks/testassign", {
	   method: 'POST'
  }).done(function(taskResponse) {
    console.log("testassign AJAX call finished successfully")
    processAssignTaskResponse(taskResponse);
  }).fail(function() {
    console.log("An error has been encountered while trying to execute the AJAX call to testassign")
  })
  
})();

