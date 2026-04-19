class ThreeUtil {
	#sizeAdjustment = true;
	#width  = 800;
	#height = 450;
	#camera = null;
	#renderer = null;
	#scene = null;
	#objectInventory = null;
	#geometryInventory = null;
	#materialInventory = null;
	#objectMap = null;
	getRenderer()	{ return this.#renderer; }
	getScene()		{ return this.#scene; }
	getCamera()		{ return this.#camera; }
	createGeometry(data, mode) {
		function createShape(path) {
			let elem = path.match(/[A-Za-z]|-?\d+(\.\d+)?/g);
			if (elem.length == 0) { throw new Error(); }
			const shape = new THREE.Shape();
			let index = 0;
			while (index < elem.length) {
				let token = elem[index++];
				switch (token) {
				case 'M':
					if (index + 2 > elem.length) { throw new Error(); }
					shape.moveTo(Number(elem[index]), Number(elem[index+1]));
					index += 2;
					break;
				case 'L':
					if (index + 2 > elem.length) { throw new Error(); }
					shape.lineTo(Number(elem[index]), Number(elem[index+1]));
					index += 2;
					break;
				case 'Q':
					if (index + 4 > elem.length) { throw new Error(); }
					shape.quadraticCurveTo(
						Number(elem[index]),   Number(elem[index+1]),
						Number(elem[index+2]), Number(elem[index+3]));
					index += 4;
					break;
				case 'C':
					if (index + 6 > elem.length) { throw new Error(); }
					shape.bezierCurveTo(
						Number(elem[index]),   Number(elem[index+1]),
						Number(elem[index+2]), Number(elem[index+3]),
						Number(elem[index+4]), Number(elem[index+5]));
					index += 6;
					break;
				case 'Z':
					shape.closePath();
					break;
				default:
					console.log('ignore: ' + token);
					break;
				}
			}
			return shape;
		}
		function createPoints(data) {
			const points = [];
			data.forEach((datum) => points.push(new THREE.Vector2(datum.x, datum.y)));
			return points;
		}

		let geometry = null;
		switch (data.type) {
			case "Comment":
			case "comment":
				return null;
			case "Link":
				geometry = this.#geometryInventory.get(data.linkTo);
				break;
			case "BoxGeometry":				// 直方体
			case "Box":
				geometry = new THREE.BoxGeometry(data.width, data.height, data.depth, data.widthSegments, data.heightSegments, data.depthSegments);
				break;
			case "CapsuleGeometry":			// カプセル
			case "Capsule":
				geometry = new THREE.CapsuleGeometry(data.radius, data.height, data.capSegments, data.radialSegments, data.heightSegments);
				break;
			case "CircleGeometry":			// 円盤
			case "Circle":
				geometry = new THREE.CircleGeometry(data.radius, data.segments, data.thetaStart, data.thetaLength);
				break;
			case "ConeGeometry":			// 円錐
			case "Cone":
				geometry = new THREE.ConeGeometry(data.radius, data.height, data.radialSegments, data.heightSegments, data.openEnded, data.thetaStart, data.thetaLength);
				break;
			case "CylinderGeometry":		// 円筒
			case "Cylinder":
				geometry = new THREE.CylinderGeometry(data.radiusTop, data.radiusBottom, data.height, data.radialSegments, data.heightSegments, data.openEnded, data.thetaStart, data.thetaLength);
				break;
			case "DodecahedronGeometry":	// 十二面体
			case "Dodecahedron":
				geometry = new THREE.DodecahedronGeometry(data.radius, data.detail);
				break;
			case "EdgesGeometry":			// ヘルパー
			case "Edges":
				break;
			case "ExtrudeGeometry":			// 押し出し
			case "Extrude":
				geometry = new THREE.ExtrudeGeometry(createShape(data.shape), data.options);
				break;
			case "IcosahedronGeometry":		// 二十面体
			case "Icosahedron":
				geometry = new THREE.IcosahedronGeometry(data.radius, data.detail);
				break;
			case "LatheGeometry":			// 旋盤
			case "Lathe":
				let points = null;
				if		(data.points != undefined)	{ points = createPoints(data.points); }
				else if (data.path != undefined)	{ points = createShape(data.path).getPoints(data.latheSegments ?? 32); }
				else {
					console.log("No points/path in LatheGeometry");
					break;
				}
				geometry = new THREE.LatheGeometry(points, data.segments);
				break;
			case "OctahedronGeometry":		// 八面体
			case "Octahedron":
				geometry = new THREE.OctahedronGeometry(data.radius, data.detail);
				break;
			case "PlaneGeometry":			// 面
			case "Plane":
				geometry = new THREE.PlaneGeometry(data.width, data.height, data.widthSegments, data.heightSegments);
				break;
			case "PolyhedronGeometry":		// 多面体
			case "Polyhedron":
				break;
			case "RingGeometry":			// リング
			case "Ring":
				geometry = new THREE.RingGeometry(data.innerRadius, data.outerRadius, data.thetaSegments, data.phiSegments, data.thetaStart, data.thetaLength);
				break;
			case "ShapeGeometry":			// シェープ
			case "Shape":
				geometry = new THREE.ShapeGeometry(createShape(data.shape), data.curveSegments);
				break;
			case "SphereGeometry":			// 球
			case "Sphere":
				geometry = new THREE.SphereGeometry(data.radius, data.widthSegments, data.heightSegments, data.phiStart, data.phiLength, data.thetaStart, data.thetaLength);
				break;
			case "TetrahedronGeometry":		// 四面体
			case "Tetrahedron":
				geometry = new THREE.TetrahedronGeometry(data.radius, data.detail);
				break;
			case "TorusGeometry":			// トーラス
			case "Torus":
				geometry = new THREE.TorusGeometry(data.radius, data.tube, data.radialSegments, data.tubularSegments, data.arc);
				break;
			case "TorusKnotGeometry":		// トーラス結び目
			case "TorusKnot":
				geometry = new THREE.TorusKnotGeometry(data.radius, data.tube, data.tubularSegments, data.radialSegments, data.p, data.q);
				break;
			case "TubeGeometry":			// チューブ
			case "Tube":
				break;
			case "Custom":					// カスタム
				geometry = window[data.func](data);
				break;
			case "WireframeGeometry":		// ヘルパー
			case "Wireframe":
				break;
			default:
				if (data.type != null && data.type.startsWith("Link:")) {
					geometry = this.#geometryInventory.get(data.type.substring("Link:".length));
					break;
				}
				console.log(data.type + " is not supported in createGeometry()");
		}
		if (geometry == null) { return null; }
		if (data.name && !mode) { this.#geometryInventory.set(data.name, geometry); }
		return geometry;
	}
	createMaterial(data, mode) {
		let material = null;
		switch (data.type) {
			case "Comment":
			case "comment":
				return null;
			case "Link":
				material = this.#materialInventory.get(data.linkTo);
				break;
			case "LineBasicMaterial":		// ワイヤーフレーム用
			case "LineBasic":
				data.type = "LineBasicMaterial";
				material = new THREE.LineBasicMaterial(data);
				break;
			case "LineDashedMaterial":		// ワイヤーフレーム用(点線)
			case "LineDashed":
				data.type = "LineDashedMaterial";
				break;
			case "MeshBasicMaterial":		// シンプル
			case "MeshBasic":
				data.type = "MeshBasicMaterial";
				material = new THREE.MeshBasicMaterial(data);
				break;
			case "MeshDepthMaterial":		// 白黒
			case "MeshDepth":
				data.type = "MeshDepthMaterial";
				material = new THREE.MeshDepthMaterial(data);
				break;
			case "MeshDistanceMaterial":	// 影用
			case "MeshDistance":
				data.type = "MeshDistanceMaterial";
				break;
			case "MeshLambertMaterial":		// 光沢のない表面（鏡面反射なし）用
			case "MeshLambert":
				data.type = "MeshLambertMaterial";
				material = new THREE.MeshLambertMaterial(data);
				break;
			case "MeshMatcapMaterial":		// 色と陰影(ライトに反応しない)
			case "MeshMatcap":
				data.type = "MeshMatcapMaterial";
				material = new THREE.MeshMatcapMaterial(data);
				break;
			case "MeshNormalMaterial":		// 法線ベクトルを RGB カラーにマッピング
			case "MeshNormal":
				data.type = "MeshNormalMaterial";
				material = new THREE.MeshNormalMaterial(data);
				break;
			case "MeshPhongMaterial":		// 鏡面反射ハイライトを持つ光沢のある表面用
			case "MeshPhong":
				data.type = "MeshPhongMaterial";
				material = new THREE.MeshPhongMaterial(data);
				break;
			case "MeshPhysicalMaterial":	// 物理ベースのレンダリング (MeshStandardMaterialの拡張)
			case "MeshPhysical":
				data.type = "MeshPhysicalMaterial";
				material = new THREE.MeshPhysicalMaterial(data);
				break;
			case "MeshStandardMaterial":	// 標準的な物理ベース 
			case "MeshStandard":
				data.type = "MeshStandardMaterial";
				material = new THREE.MeshStandardMaterial(data);
				break;
			case "MeshToonMaterial":		// トゥーンシェーディング
			case "MeshToon":
				data.type = "MeshToonMaterial";
				material = new THREE.MeshToonMaterial(data);
				break;
			case "PointsMaterial":			// 多数の点
			case "Points":
				data.type = "PointsMaterial";
				break;
			case "RawShaderMaterial":		// ShaderMaterial類似
			case "RawShader":
				data.type = "RawShaderMaterial";
				break;
			case "ShaderMaterial":			// カスタム
			case "Shader":
				data.type = "ShaderMaterial";
				break;
			case "ShadowMaterial":			// 影用
			case "Shadow":
				data.type = "ShadowMaterial";
				break;
			case "SpriteMaterial":			// スプライト用
			case "Sprite":
				data.type = "SpriteMaterial";
				break;
			case "Custom":					// カスタム
				data.type = "Custom";
				material = window[data.func](data);
				break;
			default:
				if (data.type != null && data.type.startsWith("Link:")) {
					material = this.#materialInventory.get(data.type.substring("Link:".length));
					break;
				}
				console.log(m.type + " is not supported in createMaterial()");
		}
		if (material == null) { return null; }
		if (data.name && !mode) { this.#materialInventory.set(data.name, material); }
		return material;
	}
	createObject(data, mode) {
		let object = null;
		switch (data.type) {
			case "Comment":
			case "comment":
				return null;
			case "Link":
				object = this.#objectInventory.get(data.linkTo).clone();
				break;
			case "Group":
				object = new THREE.Group();
				data.children.forEach((child) => {
					const childObject = this.createObject(child, mode);
					if (childObject != null) { object.add(childObject); }
				});
				break;
			case "Mesh":
				const geometry = this.createGeometry(data.geometry);
				if (geometry == null) { break; }
				const material = this.createMaterial(data.material);
				if (material == null) { break; }
				object = (data.wireframe == true)?new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material):new THREE.Mesh(geometry, material);
				break;
			case "Custom":					// カスタム
				object = window[data.func](data);
				break;
			default:
				if (data.type != null && data.type.startsWith("Link:")) {
					object = this.#objectInventory.get(data.type.substring("Link:".length)).clone();
					break;
				}
				console.log(data.type + " is not supported in createObject()");
		}
		if (object == null) { return null; }
		if (data.rotation)	{ object.rotation.set(data.rotation.x??0, data.rotation.y??0, data.rotation.z??0); }
		if (data.scale)		{ object.scale.set(   data.scale.x   ??1, data.scale.y   ??1, data.scale.z   ??1); }
		if (data.position)	{ object.position.set(data.position.x??0, data.position.y??0, data.position.z??0); }
		if (data.name)		{
			if (mode) { this.#objectMap.set(data.name, object); } else { this.#objectInventory.set(data.name, object); }
		}
		return object;
	}
	createRenderer(data) {
		const renderer = new THREE.WebGLRenderer();
		renderer.setSize(data.width, data.height);
		if (data.alpha)	{ renderer.setClearColor(data.background_color, 0); }
		else			{ renderer.setClearColor(data.background_color); }
		return renderer;
	}
	createCamera(data) {
		function createPerspectiveCamera(data) {
			const camera = new THREE.PerspectiveCamera(data.fov, data.aspect, data.near, data.far);
			camera.position.set(data.position.x, data.position.y, data.position.z);
			camera.lookAt(new THREE.Vector3(data.lookAt.x, data.lookAt.y, data.lookAt.z));
			return camera;
		}
		function createOrthographicCamera(data) {
			const camera = new THREE.OrthographicCamera(data.left, data.right, data.top, data.bottom, data.near, data.far);
			camera.position.set(data.position.x, data.position.y, data.position.z);
			camera.lookAt(new THREE.Vector3(data.lookAt.x, data.lookAt.y, data.lookAt.z));
			return camera;
		}
		
		switch (data.type) {
			case "PerspectiveCamera":		// 透視投影法
			case "Perspective":
				return createPerspectiveCamera(data);
			case "OrthographicCamera":		// 正投影 
			case "Orthographic":
				return createOrthographicCamera(data);
		}
		console.log(data.type + " is not supported in createCamera()");
		return null;
	}
	createLight(data) {
		function createAmbientLight(data) {
			const color = data.color.startsWith('#')?Number('0x' + data.color.substring(1)):Number(data.color);
			return new THREE.AmbientLight(color, data.intensity);
		}
		function createDirectionalLight(data) {
			const color = data.color.startsWith('#')?Number('0x' + data.color.substring(1)):Number(data.color);
			const light = new THREE.DirectionalLight(color, data.intensity);
			light.position.set(data.position.x, data.position.y, data.position.z);
			light.target.position.set(data.target.position.x, data.target.position.y, data.target.position.z);
			return light;
		}
		function createHemisphereLight(data) {
			const skyColor = data.skyColor.startsWith('#')?Number('0x' + data.skyColor.substring(1)):Number(data.skyColor);
			const groundColor = data.groundColor.startsWith('#')?Number('0x' + data.groundColor.substring(1)):Number(data.groundColor);
			const light = new THREE.HemisphereLight(skyColor, groundColor, data.intensity);
			light.position.set(data.position.x, data.position.y, data.position.z);
			return light;
		}
		function createPointLight(data) {
			const color = data.color.startsWith('#')?Number('0x' + data.color.substring(1)):Number(data.color);
			const light = new THREE.PointLight(color, data.intensity, data.distance, data.decay);
			light.position.set(data.position.x, data.position.y, data.position.z);
			return light;
		}
		function createRectAreaLight(data) {
			const color = data.color.startsWith('#')?Number('0x' + data.color.substring(1)):Number(data.color);
			const light = new THREE.RectAreaLight(color, data.intensity, data.width, data.height);
			light.position.set(data.position.x, data.position.y, data.position.z);
			light.lookAt(data.lookAt.x, data.lookAt.y, data.lookAt.z);
			return light;
		}
		function createSpotLight(data) {
			const color = data.color.startsWith('#')?Number('0x' + data.color.substring(1)):Number(data.color);
			const light = new THREE.SpotLight(color, data.intensity, data.distance, data.angle, data.penumbra, data.decay);
			light.position.set(data.position.x, data.position.y, data.position.z);
			light.target.position.set(data.target.position.x, data.target.position.y, data.target.position.z);
			return light;
		}
		
		switch (data.type) {
			case "AmbientLight":		// 環境光
			case "Ambient":
				return createAmbientLight(data);
			case "DirectionalLight":	// 指向性(平行)
			case "Directional":
				return createDirectionalLight(data);
			case "HemisphereLight":		// 空・地の2色
			case "Hemisphere":
				return createHemisphereLight(data);
			case "PointLight":			// 点光源
			case "Point":
				return createPointLight(data);
			case "RectAreaLight":		// 長方形(明るい窓やストリップライトなどの光源)
			case "RectArea":
				return createRectAreaLight(data);
			case "SpotLight":			// スポットライト(円錐)
			case "Spot":
				return createSpotLight(data);
		}
		console.log(data.type + " is not supported in createLight()");
		return null;
	}
	createFog(data) {
		const color = data.color.startsWith('#')?Number('0x' + data.color.substring(1)):Number(data.color);
		switch (data.type) {
			case "Fog":			// 線形フォグ
				return new THREE.Fog(color, data.near, data.far);
			case "FogExp2":		// 指数二乗フォグ
			case "Fog2":
				return new THREE.FogExp2(color, data.density);
		}
		console.log(data.type + " is not supported in createFog()");
		return null;
	}
	
	constructor(text) {
		this.#objectInventory = new Map();
		this.#geometryInventory = new Map();
		this.#materialInventory = new Map();
		this.#objectMap = new Map();
		this.#scene = new THREE.Scene();

		const jsonObject = JSON.parse(text);
		
		if (jsonObject.geometryInventory)	{ jsonObject.geometryInventory.forEach((data) => this.createGeometry(data, false)); }
		if (jsonObject.materialInventory)	{ jsonObject.materialInventory.forEach((data) => this.createMaterial(data, false)); }
		if (jsonObject.objectInventory)		{ jsonObject.objectInventory  .forEach((data) => this.createObject  (data, false)); }
		
		const lightDefinition = jsonObject.lights ?? JSON.parse(`[
			{
				"type": "DirectionalLight", "color": "#ffffff", "intensity": 1,
				"position": { "x": 1, "y": 1, "z": 1 }, "target": { "position": { "x": 0, "y": 0, "z": 0 } }
			},
			{ "type": "AmbientLight", "color": "#999999", "intensity": 2 }
		]`);
		lightDefinition.forEach((data) => this.#scene.add(this.createLight(data)));

		if (jsonObject.objects) {
			jsonObject.objects.forEach((data) => {
				const object = this.createObject(data, true);
				if (object != null) { this.#scene.add(object);  }
			});
		}

		if (jsonObject.fog) {
			const fog = this.createFog(jsonObject.fog);
			if (fog != null) { this.#scene.fog = fog; }
		}

		const rendererDefinition = jsonObject.renderer ?? JSON.parse(`{ "background_color": "#606060" }`);
		this.#sizeAdjustment = false;
		if (rendererDefinition.width == null || rendererDefinition.height == null) {
			rendererDefinition.width  = this.#width;
			rendererDefinition.height = this.#height;
			this.#sizeAdjustment = true;
		}
		this.#width		= rendererDefinition.width;
		this.#height	= rendererDefinition.height;
		this.#renderer	= this.createRenderer(rendererDefinition);

		const cameraDefinition = jsonObject.camera ?? JSON.parse(`{
			"type": "PerspectiveCamera", "fov": 75, "aspect": ${this.#width/this.#height},
			"near": 1, "far": 1000, "position": { "x": 0, "y": 0, "z": 40 }, "lookAt": { "x": 0, "y": 0, "z": 0 }
		}`);
		this.#camera = this.createCamera(cameraDefinition);
		this.#renderer.render(this.#scene, this.#camera);
	}
	setSize(width, height) {
		if (!this.#sizeAdjustment) { return; }
		this.#width = width;
		this.#height = height;
		this.#renderer.setSize(this.#width, this.#height);
		this.#camera.aspect = this.#width / this.#height;
		this.#camera.updateProjectionMatrix();
	}
	update() {
		if (this.#renderer != null) { this.#renderer.render(this.#scene, this.#camera); }
	}
	getObject(name) { return this.#objectMap.get(name); }
}
			
